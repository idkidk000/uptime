/** biome-ignore-all lint/suspicious/useAwait: server actions must be async */

'use server';

import { inArray } from 'drizzle-orm';
import { db } from '@/lib/drizzle';
import { tagTable } from '@/lib/drizzle/schema';
import type { TagSelect } from '@/lib/drizzle/zod/schema';

export async function getTags(ids?: number[]): Promise<TagSelect[]> {
  return db
    .select()
    .from(tagTable)
    .where(ids ? inArray(tagTable.id, ids) : undefined);
}

// TODO: add, edit
