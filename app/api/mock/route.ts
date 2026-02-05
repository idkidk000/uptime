import { type NextRequest, NextResponse } from 'next/server';
import { ServerLogger } from '@/lib/logger/server';
import { MessageClient } from '@/lib/messaging';

const messageClient = new MessageClient(import.meta.url);
const logger = new ServerLogger(messageClient);

export async function POST(request: NextRequest) {
  const json = await request.json();
  logger.info('received', json);
  return NextResponse.json({ ok: true });
}
