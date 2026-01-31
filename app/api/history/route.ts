import { NextResponse } from 'next/server';
import { db } from '@/lib/drizzle';
import { historySummaryView } from '@/lib/drizzle/schema';
import type { HistorySummarySelect } from '@/lib/drizzle/zod/schema';
import type { ApiResponse } from '@/lib/types';

export async function GET(): Promise<NextResponse<ApiResponse<HistorySummarySelect[]>>> {
  try {
    const data: HistorySummarySelect[] = await db.select().from(historySummaryView);
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) });
  }
}
