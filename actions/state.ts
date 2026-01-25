/** biome-ignore-all lint/suspicious/useAwait: server actions must be async */
'use server';

import { count, eq, getTableColumns, inArray } from 'drizzle-orm';
import { db } from '@/lib/drizzle';
import { ServiceStatus, type StateSelect, serviceTable, stateTable } from '@/lib/drizzle/schema';
import { enumEntries, pick } from '@/lib/utils';

export async function getServiceStates(serviceIds?: number[]): Promise<StateSelect[]> {
  return await db
    .select()
    .from(stateTable)
    .where(serviceIds ? inArray(stateTable.id, serviceIds) : undefined);
}

export type StatusCounts = Record<ServiceStatus | -1, number>;

// FIXME: this is horrendous
export async function getStatusCounts(): Promise<StatusCounts> {
  const counts = await db
    .select({ ...pick(getTableColumns(stateTable), ['status']), count: count() })
    .from(serviceTable)
    .leftJoin(stateTable, eq(stateTable.id, serviceTable.id))
    .groupBy(stateTable.status);
  const result = Object.fromEntries([...enumEntries(ServiceStatus).map(([, val]) => [val, 0]), [-1, 0]]) as Record<
    ServiceStatus | -1,
    number
  >;
  for (const { count, status: value } of counts) result[(value ?? -1) as keyof typeof result] = count;
  return result;
}
