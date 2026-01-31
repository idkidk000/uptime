/** biome-ignore-all lint/suspicious/useAwait: server actions must be async */
'use server';

import { eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/drizzle';
import { notifierTable } from '@/lib/drizzle/schema';
import {
  type NotifierInsert,
  type NotifierSelect,
  type NotifierUpdate,
  notifierInsertSchema,
  notifierUpdateSchema,
} from '@/lib/drizzle/zod/schema';
import { ServerLogger } from '@/lib/logger/server';
import { MessageClient } from '@/lib/messaging';
import { getNotifier } from '@/lib/notifier/utils';
import { ServiceStatus } from '@/lib/types';
import { displayName } from '@/package.json';

const messageClient = new MessageClient(import.meta.url);
const logger = new ServerLogger(import.meta.url);

export async function getNotifiers(notifierIds?: number[]): Promise<NotifierSelect[]> {
  return await db
    .select()
    .from(notifierTable)
    .where(notifierIds ? inArray(notifierTable.id, notifierIds) : undefined);
}

export async function addNotifier(data: NotifierInsert): Promise<number> {
  const sanitised = notifierInsertSchema.parse(data);
  const [{ id }] = await db.insert(notifierTable).values(sanitised).returning();
  messageClient.send({ cat: 'invalidation', kind: 'notifier', id });
  return id;
}

export async function editNotifier(data: NotifierUpdate) {
  logger.debugLow('editNotifier', data);
  const { id, ...sanitised } = notifierUpdateSchema.parse(data);
  await db.update(notifierTable).set(sanitised).where(eq(notifierTable.id, id));
  messageClient.send({ cat: 'invalidation', kind: 'notifier', id });
}

export async function checkNotifier(id: number): Promise<boolean> {
  try {
    const [{ params }] = await db.select().from(notifierTable).where(eq(notifierTable.id, id));
    const notifier = getNotifier(params);
    notifier.send({
      cat: 'status',
      id: 0,
      kind: ServiceStatus.Up,
      name: 'Notifier test',
      message: `This is a test message from ${displayName}`,
    });
    return true;
  } catch (err) {
    logger.error('Error sending test message', err);
    return false;
  }
}
