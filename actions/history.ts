/** biome-ignore-all lint/suspicious/useAwait: server actions must be async */
'use server';

import { count, eq } from 'drizzle-orm';
import type { ActionResponse } from '@/actions/types';
import { db } from '@/lib/drizzle';
import { historySummaryView, historyTable, stateTable } from '@/lib/drizzle/schema';
import type { HistorySummarySelect } from '@/lib/drizzle/zod/schema';
import { ServerLogger } from '@/lib/logger/server';
import { MessageClient } from '@/lib/messaging';
import type { Paginated } from '@/lib/types';

const messageClient = new MessageClient(import.meta.url);
const logger = new ServerLogger(messageClient);

export async function getServiceHistory(
  serviceId: number | null,
  { page = 0, pageSize = 20 }: { page?: number; pageSize?: number } = {}
): ActionResponse<Paginated<HistorySummarySelect[]>> {
  try {
    logger.debugLow({ serviceId, pageNum: page, pageSize });
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
      ok: true,
      data: {
        data,
        page,
        pages: Math.ceil(rowCount / pageSize),
      },
    };
  } catch (error) {
    logger.error(error);
    return { ok: false, error: error instanceof Error ? error : new Error(`${error}`) };
  }
}

export async function clearServiceHistory(serviceId: number): ActionResponse<null> {
  try {
    await db.transaction(async (tx) => {
      await tx.delete(historyTable).where(eq(historyTable.serviceId, serviceId));
      await tx.delete(stateTable).where(eq(stateTable.id, serviceId));
    });
    messageClient.send(
      { cat: 'invalidation', kind: 'service-history', id: serviceId },
      { cat: 'invalidation', kind: 'service-state', id: serviceId }
    );
    return { ok: true, data: null };
  } catch (error) {
    logger.error(error);
    return { ok: false, error: error instanceof Error ? error : new Error(`${error}`) };
  }
}
