import { and, eq, getTableColumns } from 'drizzle-orm';
import { db } from '@/lib/drizzle';
import { groupTable, groupToNotifierTable, notifierTable, serviceTable } from '@/lib/drizzle/schema';
import type { NotifierSelect } from '@/lib/drizzle/zod/schema';
import { MessageClient } from '@/lib/messaging';
import type { Notifier } from '@/lib/notifier';
import { getNotifier } from '@/lib/notifier/utils';
import { pick } from '@/lib/utils';

const messageClient = new MessageClient(import.meta.url);

// TODO: renotify. needs interval config on the service/group. use state.changedAt

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
}

export function stop(): void {
  /* empty */
}
