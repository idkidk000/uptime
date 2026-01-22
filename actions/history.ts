/** biome-ignore-all lint/suspicious/useAwait: server actions must be async */
'use server';

import { count, eq } from 'drizzle-orm';
import { db } from '@/lib/drizzle';
import { type HistorySummarySelect, historySummaryView, historyTable, stateTable } from '@/lib/drizzle/schema';
import { Logger } from '@/lib/logger';
import { MessageClient } from '@/lib/messaging';
import type { Paginated } from '@/lib/types';

const messageClient = new MessageClient(import.meta.url);
const logger = new Logger(import.meta.url);

export async function getServiceHistory(
  serviceId: number | null,
  { page = 0, pageSize = 20 }: { page?: number; pageSize?: number } = {}
): Promise<Paginated<HistorySummarySelect[]>> {
  logger.info({ serviceId, pageNum: page, pageSize });
  const data: HistorySummarySelect[] = await db
    .select()
    .from(historySummaryView)
    .where(typeof serviceId === 'number' ? eq(historySummaryView.serviceId, serviceId) : undefined)
    .limit(pageSize)
    .offset(page * pageSize);
  const [{ rowCount }] = await db
    .select({ rowCount: count() })
    .from(historySummaryView)
    .where(typeof serviceId === 'number' ? eq(historySummaryView.serviceId, serviceId) : undefined);
  return {
    data,
    page,
    pages: Math.ceil(rowCount / pageSize),
  };
}

export async function clearServiceHistory(serviceId: number): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(historyTable).where(eq(historyTable.serviceId, serviceId));
    await tx.delete(stateTable).where(eq(stateTable.id, serviceId));
  });
  messageClient.send(
    { cat: 'invalidation', kind: 'service-history', id: serviceId },
    { cat: 'invalidation', kind: 'service-state', id: serviceId }
  );
}
