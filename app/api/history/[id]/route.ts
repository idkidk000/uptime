import { eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/drizzle';
import { historySummaryView } from '@/lib/drizzle/schema';
import type { HistorySummarySelect } from '@/lib/drizzle/zod/schema';
import type { ApiResponse } from '@/lib/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<HistorySummarySelect[]>>> {
  try {
    const { id: idString } = await params;
    const id = Number(idString);
    const data: HistorySummarySelect[] = await db
      .select()
      .from(historySummaryView)
      .where(eq(historySummaryView.serviceId, id));
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
