import { NextResponse } from 'next/server';
import { getStatusApi, type StatusApiSelect } from '@/lib/drizzle/queries';
import type { ApiResponse } from '@/lib/types';

export async function GET(): Promise<NextResponse<ApiResponse<StatusApiSelect[]>>> {
  try {
    const data = await getStatusApi();
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
