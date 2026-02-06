import { and, eq, getTableColumns } from 'drizzle-orm';
import { db } from '@/lib/drizzle';
import { groupTable, groupToNotifierTable, notifierTable, serviceTable, stateTable } from '@/lib/drizzle/schema';
import type { NotifierSelect } from '@/lib/drizzle/zod/schema';
import { MessageClient, type StatusMessage } from '@/lib/messaging';
import type { Notifier } from '@/lib/notifier';
import { getNotifier } from '@/lib/notifier/utils';
import { Scheduler } from '@/lib/scheduler';
import { ServiceStatus } from '@/lib/types';
import { pick } from '@/lib/utils';

const messageClient = new MessageClient(import.meta.url);
const schedulers = new Map<number, Scheduler>();

export function start(): void {
  const cache = new Map<number, { updatedAt: Date; notifier: Notifier }>();

  function getInstance(entry: Pick<NotifierSelect, 'id' | 'params' | 'updatedAt'>): Notifier {
    const cached = cache.get(entry.id);
    if (cached && cached.updatedAt === entry.updatedAt) return cached.notifier;
    const notifier = getNotifier(entry.params);
    cache.set(entry.id, { updatedAt: entry.updatedAt, notifier });
    return notifier;
  }

  messageClient.subscribe({ cat: 'status' }, async (message) => {
    const entries = await db
      .select(pick(getTableColumns(notifierTable), ['id', 'params', 'updatedAt']))
      .from(serviceTable)
      .innerJoin(groupTable, eq(groupTable.id, serviceTable.groupId))
      .innerJoin(groupToNotifierTable, eq(groupToNotifierTable.groupId, groupTable.id))
      .innerJoin(
        notifierTable,
        and(eq(notifierTable.id, groupToNotifierTable.notifierId), eq(notifierTable.active, true))
      )
      .where(eq(serviceTable.id, message.id));

    for (const entry of entries) getInstance(entry).send(message);
  });

  async function updateSchedulers(id?: number) {
    const groups = await db
      .select()
      .from(groupTable)
      .where(typeof id === 'number' ? eq(groupTable.id, id) : undefined);
    if (groups.length) {
      for (const group of groups) {
        const scheduler = schedulers.get(group.id);
        if (group.renotifySeconds === null) {
          if (scheduler) {
            scheduler.stop();
            schedulers.delete(group.id);
          }
        } else {
          if (!scheduler)
            schedulers.set(
              group.id,
              new Scheduler(
                async () => {
                  const services = await db
                    .select({
                      ...pick(getTableColumns(serviceTable), ['id', 'name']),
                      ...pick(getTableColumns(stateTable), ['changedAt', 'current']),
                    })
                    .from(serviceTable)
                    .innerJoin(stateTable, eq(stateTable.id, serviceTable.id))
                    .where(and(eq(serviceTable.groupId, group.id), eq(stateTable.status, ServiceStatus.Down)));
                  if (!services.length) return;
                  const notifiers = await db
                    .select(pick(getTableColumns(notifierTable), ['id', 'params', 'updatedAt']))
                    .from(groupToNotifierTable)
                    .innerJoin(notifierTable, eq(notifierTable.id, groupToNotifierTable.notifierId))
                    .where(eq(notifierTable.active, true));
                  if (!notifiers.length) return;
                  const messages: StatusMessage[] = services.map((service) => ({
                    cat: 'status',
                    id: service.id,
                    kind: ServiceStatus.Down,
                    name: service.name,
                    reason: service.current && 'reason' in service.current ? service.current.reason : undefined,
                    // message is null when service is paused
                    message: service.current?.message ?? 'Unknown',
                  }));
                  for (const notifier of notifiers) getInstance(notifier).send(...messages);
                },
                group.renotifySeconds * 1000,
                messageClient,
                `${group.id}`
              )
            );
          else if (scheduler.millis !== group.renotifySeconds * 1000) scheduler.millis = group.renotifySeconds * 1000;
        }
      }
    } else if (typeof id === 'number') {
      // ran with id and group was deleted
      schedulers.get(id)?.stop();
      schedulers.delete(id);
    } else {
      // shouldn't be necessary since deletions will always give an invalidation, which is handled above
      for (const scheduler of schedulers.values()) scheduler.stop();
      schedulers.clear();
    }
  }

  updateSchedulers();

  messageClient.subscribe({ cat: 'invalidation', kind: 'group' }, ({ id }) => {
    updateSchedulers(id);
  });
}

export function stop(): void {
  for (const scheduler of schedulers.values()) scheduler.stop();
}
