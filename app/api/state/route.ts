import { NextResponse } from 'next/server';
import type { WrappedApiResponse } from '@/app/api/types';
import { getStateApi, type StateApiSelect } from '@/lib/drizzle/queries';
import { formatError } from '@/lib/utils';

export async function GET(): WrappedApiResponse<StateApiSelect[]> {
  try {
    const data = await getStateApi();
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: formatError(error) }, { status: 500 });
  }
}
