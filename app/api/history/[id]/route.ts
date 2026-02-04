import { eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import type { WrappedApiResponse } from '@/app/api/types';
import { db } from '@/lib/drizzle';
import { historySummaryView } from '@/lib/drizzle/schema';
import type { HistorySummarySelect } from '@/lib/drizzle/zod/schema';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): WrappedApiResponse<HistorySummarySelect[]> {
  try {
    const { id: idString } = await params;
    const id = Number(idString);
    const data: HistorySummarySelect[] = await db
      .select()
      .from(historySummaryView)
      .where(eq(historySummaryView.serviceId, id));
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error : new Error(`${error}`) },
      { status: 500 }
    );
  }
}
