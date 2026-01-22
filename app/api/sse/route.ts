import { NextResponse } from 'next/server';
import SuperJSON from 'superjson';
import { getGroups } from '@/actions/group';
import { getServices } from '@/actions/service';
import { getServiceStates } from '@/actions/state';
import type { GroupSelect, ServiceSelect, StateSelect } from '@/lib/drizzle/schema';
import { Logger } from '@/lib/logger';
import { type InvalidationKind, MessageClient } from '@/lib/messaging';

const THROTTLE_MILLIS = 100;

// TODO: type this better
export type Update = { ids: number[] } & (
  | { kind: 'group'; data: GroupSelect[] }
  | { kind: 'service-config'; data: ServiceSelect[] }
  | { kind: 'service-state'; data: StateSelect[] }
);

export interface Invalidation {
  kind: Exclude<InvalidationKind, Update['kind']>;
  ids: number[];
}

const logger = new Logger(import.meta.url);
const messageClient = new MessageClient(import.meta.url);
const streamControllers = new Set<ReadableStreamDefaultController<unknown>>();
/** only used in sync code */
const invalidations = new Map<InvalidationKind, Set<number>>();
/** also acts as a mutex */
// biome-ignore lint/correctness/noUnusedVariables: biome bug
let timeout: NodeJS.Timeout | null = null;

function timeoutCallback() {
  // fully destructure the Invalidations map and sets so they can be processed async
  // timeout is only cleared when sendClientUpdates has done
  void sendClientUpdates(
    invalidations
      .entries()
      .toArray()
      .map(([kind, ids]) => ({ kind, ids: [...ids] }))
  );
  invalidations.clear();
}

async function sendClientUpdates(destructuredInvalidations: { kind: InvalidationKind; ids: number[] }[]) {
  try {
    const messages: ([event: 'invalidate', data: Invalidation] | [event: 'update', data: Update])[] = [];
    for (const { kind, ids } of destructuredInvalidations) {
      if (kind === 'group') messages.push(['update', { kind, ids, data: await getGroups(ids) }]);
      else if (kind === 'service-config') messages.push(['update', { kind, ids, data: await getServices(ids) }]);
      else if (kind === 'service-state') messages.push(['update', { kind, ids, data: await getServiceStates(ids) }]);
      else if (kind === 'service-history') messages.push(['invalidate', { kind, ids }]);
      else throw new Error(`unhandled invalidation kind: ${kind}`);
    }
    const messageString = messages
      .map(([event, data]) => `event: ${event}\ndata: ${SuperJSON.stringify(data)}\n\n`)
      .join('');
    for (const controller of streamControllers) controller.enqueue(messageString);
  } finally {
    // re-trigger if there are new invalidations since we blocked the timeout from being set
    if (invalidations.size) timeout = setTimeout(timeoutCallback, THROTTLE_MILLIS);
    else timeout = null;
  }
}

// invalidations are throttled
messageClient.subscribe({ cat: 'invalidation' }, (message) => {
  logger.debugLow('received', message);
  if (!streamControllers.size) {
    if (invalidations.size) invalidations.clear();
    return;
  }
  if (!invalidations.get(message.kind)?.add(message.id)) invalidations.set(message.kind, new Set([message.id]));
  timeout ??= setTimeout(timeoutCallback, THROTTLE_MILLIS);
});

// toasts are sent immediately
messageClient.subscribe({ cat: 'toast' }, (message) => {
  if (!streamControllers.size) return;
  const messageString = `${SuperJSON.stringify(`event: toast\ndata: ${SuperJSON.stringify(message)}\n\n`)}`;
  for (const controller of streamControllers) controller.enqueue(messageString);
});

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
    { headers: { 'Content-Type': 'text/event-stream' } }
  );
}
