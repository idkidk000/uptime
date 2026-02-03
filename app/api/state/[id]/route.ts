import { type NextRequest, NextResponse } from 'next/server';
import { getStateApi, type StateApiSelect } from '@/lib/drizzle/queries';
import type { ApiResponse } from '@/lib/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<StateApiSelect>>> {
  try {
    const { id: idString } = await params;
    const id = Number(idString);
    const [data] = await getStateApi(id);
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
