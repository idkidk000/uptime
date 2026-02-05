import { NextResponse } from 'next/server';
import type { WrappedApiResponse } from '@/app/api/types';
import { getStatusApi, type StatusApiSelect } from '@/lib/drizzle/queries';

export async function GET(): WrappedApiResponse<StatusApiSelect[]> {
  try {
    const data = await getStatusApi();
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: `${error}` }, { status: 500 });
  }
}
