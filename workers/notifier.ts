import { and, eq, getTableColumns } from 'drizzle-orm';
import { db } from '@/lib/drizzle';
import {
  groupTable,
  groupToNotifierTable,
  type NotifierSelect,
  notifierTable,
  ServiceStatus,
  serviceStatuses,
  serviceTable,
} from '@/lib/drizzle/schema';
import { MessageClient } from '@/lib/messaging';
import { monitorDownReasons } from '@/lib/monitor';
import type { NotifierParams } from '@/lib/notifier';
import type { BaseNotifierParams, Notifier } from '@/lib/notifier/base';
import { GotifyNotifier } from '@/lib/notifier/gotify';
import { pascalToSentenceCase, pick } from '@/lib/utils';

const messageClient = new MessageClient(import.meta.url);

// TODO: renotify. needs interval config on the service/group. use state.changedAt

function getNotifier(params: NotifierParams): Notifier<BaseNotifierParams> {
  switch (params.kind) {
    case 'gotify':
      return new GotifyNotifier(params);
    default:
      throw new Error(`unhandled notifier kind ${params.kind}`);
  }
}

export async function start(): Promise<void> {
  const cache = new Map<number, { updatedAt: Date; notifier: Notifier }>(
    (await db.select().from(notifierTable).where(eq(notifierTable.active, true))).map((item) => [
      item.id,
      {
        updatedAt: item.updatedAt,
        notifier: getNotifier(item.params),
      },
    ])
  );

  function getInstance(entry: Pick<NotifierSelect, 'id' | 'params' | 'updatedAt'>): Notifier {
    const cached = cache.get(entry.id);
    if (cached && cached.updatedAt === entry.updatedAt) return cached.notifier;
    const notifier = getNotifier(entry.params);
    cache.set(entry.id, { updatedAt: entry.updatedAt, notifier });
    return notifier;
  }

  messageClient.subscribe({ cat: 'status' }, async (message) => {
    if (message.kind === ServiceStatus.Paused || message.kind === ServiceStatus.Pending) return;

    // FIXME: need to recurse groups
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

    for (const entry of entries) {
      getInstance(entry).send(
        message.kind,
        `${message.name} is ${serviceStatuses[message.kind].toLocaleLowerCase()}`,
        `${typeof message.reason === 'undefined' ? '' : `${pascalToSentenceCase(monitorDownReasons[message.reason])}: `}${message.message}`
      );
    }
  });
}

export function stop(): void {
  /* empty */
}
