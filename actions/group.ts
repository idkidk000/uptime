/** biome-ignore-all lint/suspicious/useAwait: server actions must be async */
'use server';

import { inArray } from 'drizzle-orm';
import { db } from '@/lib/drizzle';
import { type GroupSelect, groupTable } from '@/lib/drizzle/schema';

export async function getGroups(groupIds?: number[]): Promise<GroupSelect[]> {
  return await db
    .select()
    .from(groupTable)
    .where(groupIds ? inArray(groupTable.id, groupIds) : undefined);
}
