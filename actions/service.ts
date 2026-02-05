/** biome-ignore-all lint/suspicious/useAwait: server actions must be async */
'use server';

import { and, eq, getTableColumns, inArray, not, sql } from 'drizzle-orm';
import type { ActionResponse } from '@/actions/types';
import { db } from '@/lib/drizzle';
import { jsonMapper } from '@/lib/drizzle/queries';
import { serviceTable, serviceToTagTable } from '@/lib/drizzle/schema';
import {
  type ServiceInsert,
  type ServiceSelect,
  type ServiceUpdate,
  serviceInsertSchema,
  serviceUpdateSchema,
} from '@/lib/drizzle/zod/schema';
import { ServerLogger } from '@/lib/logger/server';
import { type BusMessage, MessageClient } from '@/lib/messaging';
import { omit, pick } from '@/lib/utils';

const messageClient = new MessageClient(import.meta.url);
const logger = new ServerLogger(messageClient);

export interface ServiceSelectWithTagIds extends ServiceSelect {
  tags: number[];
}

export async function getServices(serviceIds?: number[]): ActionResponse<ServiceSelectWithTagIds[]> {
  try {
    const data = await db
      .select({
        ...getTableColumns(serviceTable),
        tags: sql<
          number[]
        >`iif (count(${serviceToTagTable.tagId}) > 0, json_group_array(${serviceToTagTable.tagId}), '[]')`.mapWith(
          jsonMapper
        ),
      })
      .from(serviceTable)
      .leftJoin(serviceToTagTable, eq(serviceToTagTable.serviceId, serviceTable.id))
      .where(serviceIds ? inArray(serviceTable.id, serviceIds) : undefined)
      .groupBy(serviceTable.id);
    return { ok: true, data };
  } catch (error) {
    logger.error(error);
    return { ok: false, error: `${error}` };
  }
}

export async function checkService(id: number): ActionResponse<null> {
  try {
    messageClient.send({ cat: 'server-action', kind: 'check-service', id });
    return { ok: true, data: null };
  } catch (error) {
    logger.error(error);
    return { ok: false, error: `${error}` };
  }
}

export async function togglePaused(id: number, force?: boolean): ActionResponse<null> {
  try {
    await db
      .update(serviceTable)
      .set({ active: typeof force === 'boolean' ? force : sql`iif(active, 0, 1)` })
      .where(eq(serviceTable.id, id));
    messageClient.send(
      { cat: 'invalidation', kind: 'service-config', id },
      { cat: 'server-action', kind: 'check-service', id }
    );
    return { ok: true, data: null };
  } catch (error) {
    logger.error(error);
    return { ok: false, error: `${error}` };
  }
}

export async function setPausedMulti(ids: number[], pause: boolean): ActionResponse<null> {
  try {
    await db.update(serviceTable).set({ active: !pause }).where(inArray(serviceTable.id, ids));
    messageClient.send(
      ...ids.flatMap(
        (id) =>
          [
            { cat: 'invalidation', kind: 'service-config', id },
            { cat: 'server-action', kind: 'check-service', id },
          ] satisfies BusMessage[]
      )
    );
    return { ok: true, data: null };
  } catch (error) {
    logger.error(error);
    return { ok: false, error: `${error}` };
  }
}

export async function deleteService(id: number): ActionResponse<null> {
  try {
    await db.delete(serviceTable).where(eq(serviceTable.id, id));
    messageClient.send(
      { cat: 'invalidation', kind: 'service-config', id },
      { cat: 'invalidation', kind: 'service-history', id },
      { cat: 'invalidation', kind: 'service-state', id }
    );
    return { ok: true, data: null };
  } catch (error) {
    logger.error(error);
    return { ok: false, error: `${error}` };
  }
}

export async function addService(data: ServiceInsert, check: boolean): ActionResponse<number> {
  try {
    const sanitised = serviceInsertSchema.parse(data);
    const [row] = await db
      .insert(serviceTable)
      .values(sanitised)
      .returning(pick(getTableColumns(serviceTable), ['id']));
    messageClient.send({ cat: 'invalidation', kind: 'service-config', id: row.id });
    if (check) await checkService(row.id);
    return { ok: true, data: row.id };
  } catch (error) {
    logger.error(error);
    return { ok: false, error: `${error}` };
  }
}

export async function editService(data: ServiceUpdate, check: boolean): ActionResponse<null> {
  try {
    const sanitised = serviceUpdateSchema.parse(data);
    const [row] = await db
      .update(serviceTable)
      .set(omit(sanitised, ['id']))
      .where(eq(serviceTable.id, sanitised.id))
      .returning(pick(getTableColumns(serviceTable), ['id']));
    messageClient.send({ cat: 'invalidation', kind: 'service-config', id: row.id });
    if (check) await checkService(row.id);
    return { ok: true, data: null };
  } catch (error) {
    logger.error(error);
    return { ok: false, error: `${error}` };
  }
}

export async function setTags(serviceId: number, tagIds: number[]): ActionResponse<null> {
  try {
    await db
      .delete(serviceToTagTable)
      .where(and(eq(serviceToTagTable.serviceId, serviceId), not(inArray(serviceToTagTable.tagId, tagIds))));
    if (tagIds.length)
      await db
        .insert(serviceToTagTable)
        .values(tagIds.map((tagId) => ({ serviceId, tagId })))
        .onConflictDoNothing();
    messageClient.send({ cat: 'invalidation', kind: 'service-config', id: serviceId });
    return { ok: true, data: null };
  } catch (error) {
    logger.error(error);
    return { ok: false, error: `${error}` };
  }
}
