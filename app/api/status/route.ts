import { NextResponse } from 'next/server';
import type { WrappedApiResponse } from '@/app/api/types';
import { getStatusApi, type StatusApiSelect } from '@/lib/drizzle/queries';
import { formatError } from '@/lib/utils';

export async function GET(): WrappedApiResponse<StatusApiSelect[]> {
  try {
    const data = await getStatusApi();
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: formatError(error) }, { status: 500 });
  }
}
