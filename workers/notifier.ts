import { eq, getTableColumns } from 'drizzle-orm';
import { db } from '@/lib/drizzle';
import {
  groupTable,
  groupToNotifierTable,
  notifierTable,
  ServiceState,
  serviceStates,
  serviceTable,
} from '@/lib/drizzle/schema';
import { ServerLogger } from '@/lib/logger/server';
import { MessageClient } from '@/lib/messaging';
import { monitorDownReasons } from '@/lib/monitor';
import type { BaseNotifierParams, Notifier, NotifierParams } from '@/lib/notifier';
import { GotifyNotifier } from '@/lib/notifier/gotify';
import { pascalToSentenceCase, pick } from '@/lib/utils';

const messageClient = new MessageClient(import.meta.url);
const logger = new ServerLogger(import.meta.url);

function getNotifier(params: NotifierParams): Notifier<BaseNotifierParams> {
  switch (params.kind) {
    case 'gotify':
      return new GotifyNotifier(params);
    default:
      throw new Error(`unhandled notifier kind ${params.kind}`);
  }
}

export async function start(): Promise<void> {
  const notifiers = new Map<number, Notifier<BaseNotifierParams>>(
    (await db.select().from(notifierTable).where(eq(notifierTable.active, true))).map((item) => [
      item.id,
      getNotifier(item.params),
    ])
  );

  messageClient.subscribe({ cat: 'state' }, async (message) => {
    if (message.kind === ServiceState.Paused || message.kind === ServiceState.Pending) return;

    const notifierIds = await db
      .select(pick(getTableColumns(groupToNotifierTable), ['notifierId']))
      .from(serviceTable)
      .innerJoin(groupTable, eq(groupTable.id, serviceTable.groupId))
      .innerJoin(groupToNotifierTable, eq(groupToNotifierTable.groupId, groupTable.id))
      .where(eq(serviceTable.id, message.id));

    logger.info('sending state notification for', message, 'to notifiers', notifierIds);

    for (const notifierId of notifierIds)
      notifiers
        .get(notifierId.notifierId)
        ?.send(
          message.kind,
          `${message.name} is ${serviceStates[message.kind].toLocaleLowerCase()}`,
          `${typeof message.reason === 'undefined' ? '' : `${pascalToSentenceCase(monitorDownReasons[message.reason])}: `}${message.message}`
        );
  });
}

export function stop(): void {
  /* empty */
}
