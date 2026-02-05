/** biome-ignore-all lint/suspicious/useAwait: server actions must be async */
'use server';

import { and, eq, getTableColumns, inArray, not, sql } from 'drizzle-orm';
import {
  type GroupInsertWithNotifiers,
  type GroupSelectWithNotifiers,
  type GroupUpdateWithNotifiers,
  groupInsertWithNotifiersSchema,
  groupUpdateWithNotifiersSchema,
} from '@/actions/group/schema';
import type { ActionResponse } from '@/actions/types';
import { db } from '@/lib/drizzle';
import { numberArrayMapper } from '@/lib/drizzle/queries';
import { groupTable, groupToNotifierTable, serviceTable } from '@/lib/drizzle/schema';
import { ServerLogger } from '@/lib/logger/server';
import { type BusMessage, MessageClient } from '@/lib/messaging';
import { pick } from '@/lib/utils';

const messageClient = new MessageClient(import.meta.url);
const logger = new ServerLogger(messageClient);

export async function getGroups(groupIds?: number[]): ActionResponse<GroupSelectWithNotifiers[]> {
  try {
    const data = await db
      .select({
        ...getTableColumns(groupTable),
        notifiers: sql<number[]>`coalesce(group_concat(${groupToNotifierTable.notifierId}),'[]')`.mapWith(
          numberArrayMapper
        ),
      })
      .from(groupTable)
      .leftJoin(groupToNotifierTable, eq(groupToNotifierTable.groupId, groupTable.id))
      .where(groupIds ? inArray(groupTable.id, groupIds) : undefined)
      .groupBy(groupTable.id);
    return { ok: true, data };
  } catch (error) {
    logger.error(error);
    return { ok: false, error: error instanceof Error ? error : new Error(`${error}`) };
  }
}

export async function addGroup(data: GroupInsertWithNotifiers): ActionResponse<number> {
  try {
    const { notifiers, ...sanitised } = groupInsertWithNotifiersSchema.parse(data);
    const [row] = await db
      .insert(groupTable)
      .values(sanitised)
      .returning(pick(getTableColumns(groupTable), ['id']));
    if (notifiers.length)
      await db.insert(groupToNotifierTable).values(notifiers.map((notifierId) => ({ notifierId, groupId: row.id })));
    messageClient.send({ cat: 'invalidation', kind: 'group', id: row.id });
    return { ok: true, data: row.id };
  } catch (error) {
    logger.error(error);
    return { ok: false, error: error instanceof Error ? error : new Error(`${error}`) };
  }
}

export async function editGroup(data: GroupUpdateWithNotifiers): ActionResponse<null> {
  try {
    const { notifiers, id, ...sanitised } = groupUpdateWithNotifiersSchema.parse(data);
    await db.update(groupTable).set(sanitised).where(eq(groupTable.id, id));
    await db
      .delete(groupToNotifierTable)
      .where(and(eq(groupToNotifierTable.groupId, id), not(inArray(groupToNotifierTable.notifierId, notifiers))));
    if (notifiers.length)
      await db
        .insert(groupToNotifierTable)
        .values(notifiers.map((notifierId) => ({ notifierId, groupId: id })))
        .onConflictDoNothing();
    messageClient.send({ cat: 'invalidation', kind: 'group', id });
    return { ok: true, data: null };
  } catch (error) {
    logger.error(error);
    return { ok: false, error: error instanceof Error ? error : new Error(`${error}`) };
  }
}

export async function deleteGroup(id: number): ActionResponse<null> {
  try {
    if (id === 1) throw new Error('group 1 may not be deleted');
    const services = await db.update(serviceTable).set({ groupId: 1 }).where(eq(serviceTable.groupId, id)).returning();
    await db.delete(groupTable).where(eq(groupTable.id, id));
    messageClient.send(
      { cat: 'invalidation', kind: 'group', id },
      ...(services.map(({ id }) => ({ cat: 'invalidation', kind: 'service-config', id })) satisfies BusMessage[])
    );
    return { ok: true, data: null };
  } catch (error) {
    logger.error(error);
    return { ok: false, error: error instanceof Error ? error : new Error(`${error}`) };
  }
}
