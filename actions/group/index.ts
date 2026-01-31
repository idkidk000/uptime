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
import { db } from '@/lib/drizzle';
import { numberArrayMapper } from '@/lib/drizzle/queries';
import { groupTable, groupToNotifierTable, serviceTable } from '@/lib/drizzle/schema';
import { type BusMessage, MessageClient } from '@/lib/messaging';
import { pick } from '@/lib/utils';

const messageClient = new MessageClient(import.meta.url);

export async function getGroups(groupIds?: number[]): Promise<GroupSelectWithNotifiers[]> {
  return await db
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
  // .then((rows) => rows.map(({ notifiers, ...rest }) => ({ ...rest, notifiers: notifiers ?? [] })));
}

export async function addGroup(data: GroupInsertWithNotifiers): Promise<number> {
  const { notifiers, ...sanitised } = groupInsertWithNotifiersSchema.parse(data);
  const [row] = await db
    .insert(groupTable)
    .values(sanitised)
    .returning(pick(getTableColumns(groupTable), ['id']));
  if (notifiers.length)
    await db.insert(groupToNotifierTable).values(notifiers.map((notifierId) => ({ notifierId, groupId: row.id })));
  messageClient.send({ cat: 'invalidation', kind: 'group', id: row.id });
  return row.id;
}

export async function editGroup(data: GroupUpdateWithNotifiers): Promise<void> {
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
}

export async function deleteGroup(id: number): Promise<void> {
  if (id === 1) throw new Error('group 1 may not be deleted');
  const services = await db.update(serviceTable).set({ groupId: 1 }).where(eq(serviceTable.groupId, id)).returning();
  await db.delete(groupTable).where(eq(groupTable.id, id));
  messageClient.send(
    { cat: 'invalidation', kind: 'group', id },
    ...(services.map(({ id }) => ({ cat: 'invalidation', kind: 'service-config', id })) satisfies BusMessage[])
  );
}
