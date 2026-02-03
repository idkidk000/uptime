import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import SuperJSON from 'superjson';
import { getGroups } from '@/actions/group';
import type { GroupSelectWithNotifiers } from '@/actions/group/schema';
import { getNotifiers } from '@/actions/notifier';
import { getServices, type ServiceSelectWithTagIds } from '@/actions/service';
import { getSettings } from '@/actions/setting';
import { getServiceStates } from '@/actions/state';
import { getTags } from '@/actions/tag';
import type { NotifierSelect, StateSelect, TagSelect } from '@/lib/drizzle/zod/schema';
import { ServerLogger } from '@/lib/logger/server';
import { type InvalidationKind as InvalidateKind, MessageClient } from '@/lib/messaging';
import { SettingsClient } from '@/lib/settings';
import type { Settings } from '@/lib/settings/schema';

export type Update = { ids: number[] } & (
  | { kind: 'group'; data: GroupSelectWithNotifiers[] }
  | { kind: 'service-config'; data: ServiceSelectWithTagIds[] }
  | { kind: 'service-state'; data: StateSelect[] }
  | { kind: 'settings'; data: Settings }
  | { kind: 'notifier'; data: NotifierSelect[] }
  | { kind: 'tag'; data: TagSelect[] }
);

export interface Invalidate {
  kind: Exclude<InvalidateKind, Update['kind']>;
  ids: number[];
}

const messageClient = new MessageClient(import.meta.url);
const settingsClient = await SettingsClient.newAsync(import.meta.url, messageClient);
const logger = new ServerLogger(import.meta.url);
const streamControllers = new Set<ReadableStreamDefaultController<unknown>>();
/** only used in sync code */
const invalidations = new Map<InvalidateKind, Set<number>>();
/** also acts as a mutex */
// biome-ignore lint/correctness/noUnusedVariables: biome bug
let timeout: NodeJS.Timeout | null = null;
const deploymentId = randomUUID();

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

async function sendClientUpdates(destructuredInvalidations: { kind: InvalidateKind; ids: number[] }[]) {
  try {
    const messages: ([event: 'invalidate', data: Invalidate] | [event: 'update', data: Update])[] = [];
    for (const { kind, ids } of destructuredInvalidations) {
      if (kind === 'group') messages.push(['update', { kind, ids, data: await getGroups(ids) }]);
      else if (kind === 'service-config') messages.push(['update', { kind, ids, data: await getServices(ids) }]);
      else if (kind === 'service-state') messages.push(['update', { kind, ids, data: await getServiceStates(ids) }]);
      else if (kind === 'notifier') messages.push(['update', { kind, ids, data: await getNotifiers(ids) }]);
      else if (kind === 'service-history') messages.push(['invalidate', { kind, ids }]);
      else if (kind === 'settings') messages.push(['update', { kind, ids, data: await getSettings() }]);
      else if (kind === 'tag') messages.push(['update', { kind, ids, data: await getTags(ids) }]);
      else throw new Error(`unhandled invalidation kind: ${kind satisfies never as string}`);
    }
    const messageString = messages
      .map(([event, data]) => `event: ${event}\ndata: ${SuperJSON.stringify(data)}\n\n`)
      .join('');
    for (const controller of streamControllers) controller.enqueue(messageString);
  } finally {
    // re-trigger if there are new invalidations since we blocked the timeout from being set
    if (invalidations.size) timeout = setTimeout(timeoutCallback, settingsClient.current.sse.throttle);
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
  timeout ??= setTimeout(timeoutCallback, settingsClient.current.sse.throttle);
});

// toasts are sent immediately
messageClient.subscribe({ cat: 'toast' }, (message) => {
  if (!streamControllers.size) return;
  const messageString = `event: toast\ndata: ${SuperJSON.stringify(message)}\n\n`;
  for (const controller of streamControllers) controller.enqueue(messageString);
});

// as are client actions (reload)
messageClient.subscribe({ cat: 'client-action' }, (message) => {
  if (!streamControllers.size) return;
  const messageString = `event: client-action\ndata: ${SuperJSON.stringify(message)}\n\n`;
  for (const controller of streamControllers) controller.enqueue(messageString);
});

export function GET() {
  const abortController = new AbortController();
  return new NextResponse(
    new ReadableStream({
      start: (streamController) => {
        streamControllers.add(streamController);
        abortController.signal.addEventListener('abort', () => streamControllers.delete(streamController));
        // first message fires the `open` event on the client
        streamController.enqueue(`event: connected\ndata: ${deploymentId}\n\n`);
      },
      cancel: () => abortController.abort(),
    }),
    { headers: { 'Content-Type': 'text/event-stream' } }
  );
}
