import { NextResponse } from 'next/server';
import type { WrappedApiResponse } from '@/app/api/types';
import { db } from '@/lib/drizzle';
import { historySummaryView } from '@/lib/drizzle/schema';
import type { HistorySummarySelect } from '@/lib/drizzle/zod/schema';
import { formatError } from '@/lib/utils';

export async function GET(): WrappedApiResponse<HistorySummarySelect[]> {
  try {
    const data: HistorySummarySelect[] = await db.select().from(historySummaryView);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: formatError(error) }, { status: 500 });
  }
}
