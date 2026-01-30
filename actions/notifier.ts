/** biome-ignore-all lint/suspicious/useAwait: server actions must be async */
'use server';

import { inArray } from 'drizzle-orm';
import { db } from '@/lib/drizzle';
import { type NotifierSelect, notifierTable } from '@/lib/drizzle/schema';

export async function getNotifiers(notifierIds?: number[]): Promise<NotifierSelect[]> {
  return await db
    .select()
    .from(notifierTable)
    .where(notifierIds ? inArray(notifierTable.id, notifierIds) : undefined);
}
