import { NextResponse } from 'next/server';
import { db } from '@/lib/drizzle';
import { type HistorySummarySelect, historySummaryView } from '@/lib/drizzle/schema';
import type { ApiResponse } from '@/lib/types';

export async function GET(): Promise<NextResponse<ApiResponse<HistorySummarySelect[]>>> {
  try {
    const data: HistorySummarySelect[] = await db.select().from(historySummaryView);
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) });
  }
}
