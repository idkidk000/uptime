import { NextResponse } from 'next/server';
import { getServiceStates } from '@/actions/state';
import type { StateSelect } from '@/lib/drizzle/zod/schema';
import type { ApiResponse } from '@/lib/types';

export async function GET(): Promise<NextResponse<ApiResponse<StateSelect[]>>> {
  try {
    const data = await getServiceStates();
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) });
  }
}
