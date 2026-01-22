/** biome-ignore-all lint/suspicious/useAwait: server actions must be async */
'use server';

import { eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/drizzle';
import { type ServiceSelect, serviceTable } from '@/lib/drizzle/schema';
import { MessageClient } from '@/lib/messaging';

const messageClient = new MessageClient(import.meta.url);

export async function getServices(serviceIds?: number[]): Promise<ServiceSelect[]> {
  return await db
    .select()
    .from(serviceTable)
    .where(serviceIds ? inArray(serviceTable.id, serviceIds) : undefined);
}

export async function checkService(id: number): Promise<void> {
  messageClient.send({ cat: 'action', kind: 'test-service', id });
}

export async function togglePaused(id: number): Promise<void> {
  await db.update(serviceTable).set({ active: sql`iif(active, 0, 1)` }).where(eq(serviceTable.id, id));
  messageClient.send({ cat: 'invalidation', kind: 'service-config', id });
}

export async function deleteService(id: number): Promise<void> {
  await db.delete(serviceTable).where(eq(serviceTable.id, id));
  messageClient.send(
    { cat: 'invalidation', kind: 'service-config', id },
    { cat: 'invalidation', kind: 'service-history', id },
    { cat: 'invalidation', kind: 'service-state', id }
  );
}
