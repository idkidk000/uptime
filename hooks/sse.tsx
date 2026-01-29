'use client';

import { createContext, type ReactNode, useContext, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import SuperJSON from 'superjson';
import type { Invalidate, Update } from '@/app/api/sse/route';
import { useLogger } from '@/hooks/logger';
import type { ToastMessage } from '@/lib/messaging';

const RECONNECT_MILLIS = 15_000;
const MAX_SSE_ERRORS = 3;

interface Context {
  subscribe<Kind extends SseMessageKind>(kind: Kind, callback: (message: SseMessage<Kind>) => void): () => void;
}

export type SseMessageKind = 'update' | 'invalidate' | 'toast' | 'reconnect';
export type SseMessage<Kind extends SseMessageKind> = Kind extends 'update'
  ? Update
  : Kind extends 'invalidate'
    ? Invalidate
    : Kind extends 'toast'
      ? ToastMessage
      : Kind extends 'reconnect'
        ? null
        : never;

// this is a bit jank because i don't have a way to narrow SseMessage in `callbacksRef`
type Callback = (message: SseMessage<SseMessageKind>) => void;

const Context = createContext<Context | null>(null);

export function SseProvider({ children }: { children: ReactNode }) {
  const callbacksRef = useRef(new Map<SseMessageKind, Set<Callback>>());
  // value change reconnects sse since it's in a useEffect
  const [sseReconnect, setSseReconnect] = useState(0);
  const state = useRef<{
    deploymentId: string | null;
    errors: number;
    interval: NodeJS.Timeout | null;
  }>({ deploymentId: null, errors: 0, interval: null });

  const logger = useLogger(import.meta.url);

  const beginReconnectInterval = useEffectEvent(() => {
    state.current.interval ??= setInterval(() => {
      setSseReconnect(Math.random());
      state.current.interval = null;
    }, RECONNECT_MILLIS);
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies(sseReconnect): deliberate
  useEffect(() => {
    beginReconnectInterval();
    const eventSource = new EventSource('/api/sse');
    eventSource.addEventListener('connected', (event) => {
      // successfully connected. stop the reconnect interval
      if (state.current.interval) {
        clearInterval(state.current.interval);
        state.current.interval = null;
      }
      const deploymentId: string = event.data;
      logger.info('deploymentId changed from', state.current.deploymentId, 'to', deploymentId);
      // deployment id (generated on server startup) changed - reload the frontend
      if (state.current.deploymentId !== null && state.current.deploymentId !== deploymentId) {
        window.location.reload();
        return;
      }
      state.current.deploymentId = deploymentId;
      // used by app-queries hook to invalidate all queries
      if (state.current.errors) {
        logger.success('reconnected after', state.current.errors, 'errors');
        for (const callback of callbacksRef.current.get('reconnect') ?? []) callback(null);
        state.current.errors = 0;
      }
    });
    // `error` event has nothing useful
    eventSource.addEventListener('error', () => {
      ++state.current.errors;
      logger[state.current.errors >= MAX_SSE_ERRORS ? 'error' : 'warn'](`error count is ${state.current.errors}`);
      beginReconnectInterval();
      eventSource.close();
    });
    for (const kind of ['invalidate', 'toast', 'update'] satisfies SseMessageKind[]) {
      eventSource.addEventListener(kind, (event) => {
        const message: SseMessage<typeof kind> = SuperJSON.parse(event.data);
        for (const callback of callbacksRef.current.get(kind) ?? []) callback(message);
      });
    }
    return () => eventSource.close();
  }, [sseReconnect]);

  // biome-ignore format: no
  const value: Context = useMemo(() => ({
    subscribe(kind, callback) {
      const untyped = callback as Callback
      if (!callbacksRef.current.get(kind)?.add(untyped)) callbacksRef.current.set(kind, new Set([untyped]));
      return () => callbacksRef.current.get(kind)?.delete(untyped);
    },
  }), []);

  return <Context value={value}>{children}</Context>;
}

export function useSse() {
  const context = useContext(Context);
  if (!context) throw new Error('useSse must be used underneath an SseProvider');
  return context;
}
