import { NextResponse } from 'next/server';
import SuperJSON from 'superjson';
import { type InvalidationKind, MessageClient, type MessageWithId } from '@/lib/messaging';

// TODO: select and send patches for invalidated records

const THROTTLE_MS = 100;

export type Invalidations = Map<InvalidationKind, Set<number>>;

const messageClient = new MessageClient(import.meta.url);
const streamControllers = new Set<ReadableStreamDefaultController<unknown>>();
const invalidations: Invalidations = new Map<InvalidationKind, Set<number>>();
// biome-ignore lint/correctness/noUnusedVariables: biome bug
let timeout: NodeJS.Timeout | null = null;

function handleInvalidation(message: Extract<MessageWithId, { kind: 'invalidation' }>) {
  if (!streamControllers.size) return;
  if (!invalidations.get(message.value)?.add(message.id)) invalidations.set(message.value, new Set([message.id]));
  timeout ??= setTimeout(() => {
    timeout = null;
    const message = `event: invalidate\ndata: ${SuperJSON.stringify(invalidations)}\n\n`;
    for (const controller of streamControllers) controller.enqueue(message);
    invalidations.clear();
  }, THROTTLE_MS);
}

messageClient.subscribe({ kind: 'invalidation', value: 'group' }, handleInvalidation);
messageClient.subscribe({ kind: 'invalidation', value: 'service-config' }, handleInvalidation);
messageClient.subscribe({ kind: 'invalidation', value: 'service-history' }, handleInvalidation);
messageClient.subscribe({ kind: 'invalidation', value: 'service-state' }, handleInvalidation);

export function GET() {
  const abortController = new AbortController();
  return new NextResponse(
    new ReadableStream({
      start: (streamController) => {
        streamControllers.add(streamController);
        abortController.signal.addEventListener('abort', () => streamControllers.delete(streamController));
      },
      cancel: () => abortController.abort(),
    }),
    {
      headers: { 'Content-Type': 'text/event-stream' },
    }
  );
}
