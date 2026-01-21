/** biome-ignore-all lint/suspicious/useAwait: server actions must be async */
'use server';

import { count, eq } from 'drizzle-orm';
import { db } from '@/lib/drizzle';
import { type HistorySummarySelect, historySummaryView, historyTable, stateTable } from '@/lib/drizzle/schema';
import { Logger } from '@/lib/logger';
import { MessageClient } from '@/lib/messaging';

const messageClient = new MessageClient(import.meta.url);
const logger = new Logger(import.meta.url);

export interface Paginated<Item> {
  hasMore: boolean;
  pages: number;
  data: Item[];
}

export async function getServiceHistory(
  serviceId: number | null,
  { pageNum = 0, pageSize = 20 }: { pageNum?: number; pageSize?: number } = {}
): Promise<Paginated<HistorySummarySelect>> {
  logger.info({ serviceId, pageNum, pageSize });
  const data: HistorySummarySelect[] = await db
    .select()
    .from(historySummaryView)
    .where(typeof serviceId === 'number' ? eq(historySummaryView.serviceId, serviceId) : undefined)
    .limit(pageSize)
    .offset(pageNum * pageSize);
  const [{ rowCount }] = await db
    .select({ rowCount: count() })
    .from(historySummaryView)
    .where(typeof serviceId === 'number' ? eq(historySummaryView.serviceId, serviceId) : undefined);
  return {
    data,
    hasMore: rowCount >= (pageNum + 1) * pageSize,
    pages: Math.ceil(rowCount / pageSize),
  };
}

export async function clearServiceHistory(serviceId: number): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(historyTable).where(eq(historyTable.serviceId, serviceId));
    await tx.delete(stateTable).where(eq(stateTable.serviceId, serviceId));
  });
  messageClient.send(
    { kind: 'invalidation', value: 'service-history', id: serviceId },
    { kind: 'invalidation', value: 'service-state', id: serviceId }
  );
}
