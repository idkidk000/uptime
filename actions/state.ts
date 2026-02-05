/** biome-ignore-all lint/suspicious/useAwait: server actions must be async */
'use server';

import { count, eq, getTableColumns, inArray } from 'drizzle-orm';
import type { ActionResponse } from '@/actions/types';
import { db } from '@/lib/drizzle';
import { serviceTable, stateTable } from '@/lib/drizzle/schema';
import type { StateSelect } from '@/lib/drizzle/zod/schema';
import { ServerLogger } from '@/lib/logger/server';
import { MessageClient } from '@/lib/messaging';
import { ServiceStatus } from '@/lib/types';
import { enumEntries, pick } from '@/lib/utils';

export type StatusCounts = Record<ServiceStatus | -1, number>;

const messageClient = new MessageClient(import.meta.url);
const logger = new ServerLogger(messageClient);

export async function getServiceStates(serviceIds?: number[]): ActionResponse<StateSelect[]> {
  try {
    const data = await db
      .select()
      .from(stateTable)
      .where(serviceIds ? inArray(stateTable.id, serviceIds) : undefined);
    return { ok: true, data };
  } catch (error) {
    logger.error(error);
    return { ok: false, error: error instanceof Error ? error : new Error(`${error}`) };
  }
}

export async function getStatusCounts(): ActionResponse<StatusCounts> {
  try {
    const counts = await db
      .select({ ...pick(getTableColumns(stateTable), ['status']), count: count() })
      .from(serviceTable)
      .leftJoin(stateTable, eq(stateTable.id, serviceTable.id))
      .groupBy(stateTable.status);
    const data = Object.fromEntries([...enumEntries(ServiceStatus).map(([, val]) => [val, 0]), [-1, 0]]) as Record<
      ServiceStatus | -1,
      number
    >;
    for (const { count, status: value } of counts) data[(value ?? -1) as keyof typeof data] = count;
    return { ok: true, data };
  } catch (error) {
    logger.error(error);
    return { ok: false, error: error instanceof Error ? error : new Error(`${error}`) };
  }
}
