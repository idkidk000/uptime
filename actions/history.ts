/** biome-ignore-all lint/suspicious/useAwait: server actions must be async */
'use server';

import { eq } from 'drizzle-orm';
import { db } from '@/lib/drizzle';
import { type HistorySelect, historyTable, stateTable } from '@/lib/drizzle/schema';
import { MessageClient } from '@/lib/messaging';

const messageClient = new MessageClient(import.meta.url);

export async function getHistory(serviceId: number): Promise<HistorySelect[]> {
  return await db.select().from(historyTable).where(eq(historyTable.serviceId, serviceId));
}

export async function getHistorySummary(serviceId: number): Promise<HistorySelect[]> {
  return (await db.select().from(historyTable).where(eq(historyTable.serviceId, serviceId))).filter(
    (item, i, arr) => i === 0 || arr[i - 1].state !== item.state
  );
}

export async function clearHistory(serviceId: number): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(historyTable).where(eq(historyTable.serviceId, serviceId));
    await tx.delete(stateTable).where(eq(stateTable.serviceId, serviceId));
  });
  messageClient.send({ kind: 'invalidation', value: 'service-history', id: serviceId });
  messageClient.send({ kind: 'invalidation', value: 'service-state', id: serviceId });
}
