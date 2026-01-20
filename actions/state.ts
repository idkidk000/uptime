/** biome-ignore-all lint/suspicious/useAwait: server actions must be async */
'use server';

import { inArray } from 'drizzle-orm';
import { db } from '@/lib/drizzle';
import { type StateSelect, stateTable } from '@/lib/drizzle/schema';

export async function getStates(serviceIds?: number[]): Promise<StateSelect[]> {
  return await db
    .select()
    .from(stateTable)
    .where(serviceIds ? inArray(stateTable.serviceId, serviceIds) : undefined);
}
