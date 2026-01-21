/** biome-ignore-all lint/suspicious/useAwait: server actions must be async */
'use server';

import { count, eq, getTableColumns, inArray } from 'drizzle-orm';
import { db } from '@/lib/drizzle';
import { ServiceState, type StateSelect, serviceTable, stateTable } from '@/lib/drizzle/schema';
import { enumEntries, pick } from '@/lib/utils';

export async function getServiceStates(serviceIds?: number[]): Promise<StateSelect[]> {
  return await db
    .select()
    .from(stateTable)
    .where(serviceIds ? inArray(stateTable.serviceId, serviceIds) : undefined);
}

// FIXME: this is horrendous
export async function getStateCounts(): Promise<Record<ServiceState | -1, number>> {
  const counts = await db
    .select({ ...pick(getTableColumns(stateTable), ['value']), count: count() })
    .from(serviceTable)
    .leftJoin(stateTable, eq(stateTable.serviceId, serviceTable.id))
    .groupBy(stateTable.value);
  const result = Object.fromEntries([...enumEntries(ServiceState).map(([, val]) => [val, 0]), [-1, 0]]) as Record<
    ServiceState | -1,
    number
  >;
  for (const { count, value } of counts) result[(value ?? -1) as keyof typeof result] = count;
  return result;
}
