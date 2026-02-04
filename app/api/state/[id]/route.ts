import { type NextRequest, NextResponse } from 'next/server';
import type { WrappedApiResponse } from '@/app/api/types';
import { getStateApi, type StateApiSelect } from '@/lib/drizzle/queries';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): WrappedApiResponse<StateApiSelect> {
  try {
    const { id: idString } = await params;
    const id = Number(idString);
    const [data] = await getStateApi(id);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error : new Error(`${error}`) },
      { status: 500 }
    );
  }
}
