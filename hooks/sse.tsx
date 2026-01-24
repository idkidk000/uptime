'use client';

import { createContext, type ReactNode, useContext, useEffect, useMemo, useRef } from 'react';
import SuperJSON from 'superjson';
import type { Invalidation, Update } from '@/app/api/sse/route';
import { useLogger } from '@/hooks/logger';
import type { Message } from '@/lib/messaging';

interface Context {
  subscribe<Kind extends 'invalidate' | 'update' | 'toast'>(
    kind: Kind,
    callback: (
      message: Kind extends 'invalidate'
        ? Invalidation
        : Kind extends 'update'
          ? Update
          : Kind extends 'toast'
            ? Extract<Message, { cat: 'toast' }>
            : never
    ) => void
  ): () => void;
}

const Context = createContext<Context | null>(null);

export function SseProvider({ children }: { children: ReactNode }) {
  const callbacksRef = useRef(new Map<'invalidate' | 'update' | 'toast', Set<(message: unknown) => void>>());
  const logger = useLogger(import.meta.url);

  useEffect(() => {
    const eventSource = new EventSource('/api/sse');
    eventSource.addEventListener('error', (err) => logger.error('sse error', err));
    eventSource.addEventListener('invalidate', (event) => {
      const message = SuperJSON.parse(event.data);
      for (const callback of callbacksRef.current.get('invalidate') ?? []) callback(message);
    });
    eventSource.addEventListener('update', (event) => {
      const message = SuperJSON.parse(event.data);
      for (const callback of callbacksRef.current.get('update') ?? []) callback(message);
    });
    eventSource.addEventListener('toast', (event) => {
      const message = SuperJSON.parse(event.data);
      for (const callback of callbacksRef.current.get('toast') ?? []) callback(message);
    });
    return () => eventSource.close();
  }, []);

  // biome-ignore format: no
  const value: Context = useMemo(() => ({
    subscribe(kind, callback) {
      // this is quite lazy
      const untyped = callback as (message: unknown) => void;
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
