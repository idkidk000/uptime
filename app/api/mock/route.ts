import { type NextRequest, NextResponse } from 'next/server';
import { ServerLogger } from '@/lib/logger/server';

const logger = new ServerLogger(import.meta.url);

export async function POST(request: NextRequest) {
  const json = await request.json();
  logger.info('received', json);
  return NextResponse.json({ ok: true });
}
