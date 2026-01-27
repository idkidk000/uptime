/** biome-ignore-all lint/suspicious/useAwait: server actions must be async */
'use server';

import { eq, getTableColumns, inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/drizzle';
import { type ServiceInsert, type ServiceSelect, serviceInsertSchema, serviceTable } from '@/lib/drizzle/schema';
import { type BusMessage, MessageClient } from '@/lib/messaging';
import { pick } from '@/lib/utils';

const messageClient = new MessageClient(import.meta.url);

export async function getServices(serviceIds?: number[]): Promise<ServiceSelect[]> {
  return await db
    .select()
    .from(serviceTable)
    .where(serviceIds ? inArray(serviceTable.id, serviceIds) : undefined);
}

export async function checkService(id: number): Promise<void> {
  messageClient.send({ cat: 'action', kind: 'check-service', id });
}

export async function togglePaused(id: number, force?: boolean): Promise<void> {
  await db
    .update(serviceTable)
    .set({ active: typeof force === 'boolean' ? force : sql`iif(active, 0, 1)` })
    .where(eq(serviceTable.id, id));
  messageClient.send({ cat: 'invalidation', kind: 'service-config', id });
}

export async function setPausedMulti(ids: number[], pause: boolean): Promise<void> {
  await db.update(serviceTable).set({ active: !pause }).where(inArray(serviceTable.id, ids));
  messageClient.send(...ids.map((id) => ({ cat: 'invalidation', kind: 'service-config', id }) satisfies BusMessage));
}

export async function deleteService(id: number): Promise<void> {
  await db.delete(serviceTable).where(eq(serviceTable.id, id));
  messageClient.send(
    { cat: 'invalidation', kind: 'service-config', id },
    { cat: 'invalidation', kind: 'service-history', id },
    { cat: 'invalidation', kind: 'service-state', id }
  );
}

export async function addService(data: ServiceInsert, check: boolean): Promise<void> {
  // serviceInsertSchema includes monitorParamsSchema
  const sanitised = serviceInsertSchema.parse(data);
  const [row] = await db
    .insert(serviceTable)
    .values(sanitised)
    .returning(pick(getTableColumns(serviceTable), ['id']));
  if (check) await checkService(row.id);
}
