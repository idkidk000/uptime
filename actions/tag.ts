/** biome-ignore-all lint/suspicious/useAwait: server actions must be async */

'use server';

import { eq, getTableColumns, inArray, not } from 'drizzle-orm';
import type { ActionResponse } from '@/actions/types';
import { db } from '@/lib/drizzle';
import { serviceTable, serviceToTagTable, tagTable } from '@/lib/drizzle/schema';
import {
  type TagInsert,
  type TagSelect,
  type TagUpdate,
  tagInsertSchema,
  tagUpdateSchema,
} from '@/lib/drizzle/zod/schema';
import { ServerLogger } from '@/lib/logger/server';
import { type BusMessage, MessageClient } from '@/lib/messaging';
import { formatError, pick } from '@/lib/utils';

const messageClient = new MessageClient(import.meta.url);
const logger = new ServerLogger(messageClient);

export async function getTags(ids?: number[]): ActionResponse<TagSelect[]> {
  try {
    const data = await db
      .select()
      .from(tagTable)
      .where(ids ? inArray(tagTable.id, ids) : undefined);
    return { ok: true, data };
  } catch (error) {
    logger.error(error);
    return { ok: false, error: formatError(error) };
  }
}

export async function addTag(data: TagInsert): ActionResponse<number> {
  try {
    const sanitised = tagInsertSchema.parse(data);
    const [{ id }] = await db
      .insert(tagTable)
      .values(sanitised)
      .returning(pick(getTableColumns(tagTable), ['id']));
    messageClient.send({ cat: 'invalidation', kind: 'tag', id });
    return { ok: true, data: id };
  } catch (error) {
    logger.error(error);
    return { ok: false, error: formatError(error) };
  }
}

export async function editTag(data: TagUpdate): ActionResponse<null> {
  try {
    const { id, ...sanitised } = tagUpdateSchema.parse(data);
    await db.update(tagTable).set(sanitised).where(eq(tagTable.id, id));
    messageClient.send({ cat: 'invalidation', kind: 'tag', id });
    return { ok: true, data: null };
  } catch (error) {
    logger.error(error);
    return { ok: false, error: formatError(error) };
  }
}

export async function deleteTag(id: number): ActionResponse<null> {
  try {
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
    return { ok: true, data: null };
  } catch (error) {
    logger.error(error);
    return { ok: false, error: formatError(error) };
  }
}

export async function tagServices(tagId: number, serviceIds: number[], replace: boolean): ActionResponse<null> {
  try {
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
    return { ok: true, data: null };
  } catch (error) {
    logger.error(error);
    return { ok: false, error: formatError(error) };
  }
}
