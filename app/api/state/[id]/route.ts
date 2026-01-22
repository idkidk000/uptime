import { type NextRequest, NextResponse } from 'next/server';
import { getServiceStates } from '@/actions/state';
import type { StateSelect } from '@/lib/drizzle/schema';
import type { ApiResponse } from '@/lib/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<StateSelect>>> {
  try {
    const { id: idString } = await params;
    const id = Number(idString);
    const [data] = await getServiceStates([id]);
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) });
  }
}
