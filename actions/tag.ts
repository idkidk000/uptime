/** biome-ignore-all lint/suspicious/useAwait: server actions must be async */

'use server';

import { eq, getTableColumns, inArray, not } from 'drizzle-orm';
import { db } from '@/lib/drizzle';
import { serviceTable, serviceToTagTable, tagTable } from '@/lib/drizzle/schema';
import {
  type TagInsert,
  type TagSelect,
  type TagUpdate,
  tagInsertSchema,
  tagUpdateSchema,
} from '@/lib/drizzle/zod/schema';
import { type BusMessage, MessageClient } from '@/lib/messaging';
import { pick } from '@/lib/utils';

const messageClient = new MessageClient(import.meta.url);

export async function getTags(ids?: number[]): Promise<TagSelect[]> {
  return db
    .select()
    .from(tagTable)
    .where(ids ? inArray(tagTable.id, ids) : undefined);
}

export async function addTag(data: TagInsert): Promise<number> {
  const sanitised = tagInsertSchema.parse(data);
  const [{ id }] = await db
    .insert(tagTable)
    .values(sanitised)
    .returning(pick(getTableColumns(tagTable), ['id']));
  messageClient.send({ cat: 'invalidation', kind: 'tag', id });
  return id;
}

export async function editTag(data: TagUpdate): Promise<void> {
  const { id, ...sanitised } = tagUpdateSchema.parse(data);
  await db.update(tagTable).set(sanitised).where(eq(tagTable.id, id));
  messageClient.send({ cat: 'invalidation', kind: 'tag', id });
}

export async function deleteTag(id: number): Promise<void> {
  const services = await db
    .select(pick(getTableColumns(serviceTable), ['id']))
    .from(serviceToTagTable)
    .innerJoin(serviceTable, eq(serviceTable.id, serviceToTagTable.serviceId))
    .where(eq(serviceToTagTable.tagId, id));
  await db.delete(tagTable).where(eq(tagTable.id, id));
  messageClient.send(
    { cat: 'invalidation', kind: 'tag', id },
    ...(services.map(({ id }) => ({ cat: 'invalidation', kind: 'service-config', id })) satisfies BusMessage[])
  );
}

export async function tagServices(tagId: number, serviceIds: number[], replace: boolean): Promise<void> {
  const invalidatedIds: number[] = [...serviceIds];
  if (replace)
    invalidatedIds.push(
      ...(await db
        .delete(serviceToTagTable)
        .where(not(inArray(serviceToTagTable.serviceId, serviceIds)))
        .returning()
        .then((data) => data.map(({ serviceId }) => serviceId)))
    );
  if (serviceIds.length)
    await db
      .insert(serviceToTagTable)
      .values(serviceIds.map((serviceId) => ({ tagId, serviceId })))
      .onConflictDoNothing()
      .returning();
  messageClient.send(
    { cat: 'invalidation', kind: 'tag', id: tagId },
    ...(invalidatedIds.map((id) => ({ cat: 'invalidation', kind: 'service-config', id })) satisfies BusMessage[])
  );
}
