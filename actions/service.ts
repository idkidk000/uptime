/** biome-ignore-all lint/suspicious/useAwait: server actions must be async */
'use server';

import { eq, getTableColumns, inArray, sql } from 'drizzle-orm';
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
import { type BusMessage, MessageClient } from '@/lib/messaging';
import { omit, pick } from '@/lib/utils';

const messageClient = new MessageClient(import.meta.url);

export interface ServiceSelectWithTagIds extends ServiceSelect {
  tags: number[];
}

export async function getServices(serviceIds?: number[]): Promise<ServiceSelectWithTagIds[]> {
  return await db
    .select({
      ...getTableColumns(serviceTable),
      tags: sql<number[]>`json_group_array(${serviceToTagTable.tagId})`.mapWith(jsonMapper),
    })
    .from(serviceTable)
    .leftJoin(serviceToTagTable, eq(serviceToTagTable.serviceId, serviceTable.id))
    .where(serviceIds ? inArray(serviceTable.id, serviceIds) : undefined)
    .groupBy(serviceTable.id);
}

export async function checkService(id: number): Promise<void> {
  messageClient.send({ cat: 'server-action', kind: 'check-service', id });
}

export async function togglePaused(id: number, force?: boolean): Promise<void> {
  await db
    .update(serviceTable)
    .set({ active: typeof force === 'boolean' ? force : sql`iif(active, 0, 1)` })
    .where(eq(serviceTable.id, id));
  messageClient.send(
    { cat: 'invalidation', kind: 'service-config', id },
    { cat: 'server-action', kind: 'check-service', id }
  );
}

export async function setPausedMulti(ids: number[], pause: boolean): Promise<void> {
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
}

export async function deleteService(id: number): Promise<void> {
  await db.delete(serviceTable).where(eq(serviceTable.id, id));
  messageClient.send(
    { cat: 'invalidation', kind: 'service-config', id },
    { cat: 'invalidation', kind: 'service-history', id },
    { cat: 'invalidation', kind: 'service-state', id }
  );
}

export async function addService(data: ServiceInsert, check: boolean): Promise<number> {
  // serviceInsertSchema includes monitorParamsSchema
  const sanitised = serviceInsertSchema.parse(data);
  const [row] = await db
    .insert(serviceTable)
    .values(sanitised)
    .returning(pick(getTableColumns(serviceTable), ['id']));
  messageClient.send({ cat: 'invalidation', kind: 'service-config', id: row.id });
  if (check) await checkService(row.id);
  return row.id;
}

export async function editService(data: ServiceUpdate, check: boolean): Promise<void> {
  // serviceInsertSchema includes monitorParamsSchema
  const sanitised = serviceUpdateSchema.parse(data);
  const [row] = await db
    .update(serviceTable)
    .set(omit(sanitised, ['id']))
    .where(eq(serviceTable.id, sanitised.id))
    .returning(pick(getTableColumns(serviceTable), ['id']));
  messageClient.send({ cat: 'invalidation', kind: 'service-config', id: row.id });
  if (check) await checkService(row.id);
}
