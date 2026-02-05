import { NextResponse } from 'next/server';
import type { WrappedApiResponse } from '@/app/api/types';
import { getStateApi, type StateApiSelect } from '@/lib/drizzle/queries';

export async function GET(): WrappedApiResponse<StateApiSelect[]> {
  try {
    const data = await getStateApi();
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: `${error}` }, { status: 500 });
  }
}
