'use client';

import { createContext, type ReactNode, useContext, useEffect, useMemo, useRef } from 'react';
import SuperJSON from 'superjson';
import type { SseMessage, SseMessageKind } from '@/app/api/sse/route';
import { useLogger } from '@/hooks/logger';

interface Context {
  subscribe<Kind extends SseMessageKind>(kind: Kind, callback: (message: SseMessage<Kind>) => void): () => void;
}

// this is a bit jank because i don't have a way to narrow SseMessage in `callbacksRef`
type Callback = (message: SseMessage<SseMessageKind>) => void;

const Context = createContext<Context | null>(null);

export function SseProvider({ children }: { children: ReactNode }) {
  const callbacksRef = useRef(new Map<SseMessageKind, Set<Callback>>());

  const logger = useLogger(import.meta.url);

  useEffect(() => {
    const eventSource = new EventSource('/api/sse');
    eventSource.addEventListener('error', (err) => logger.error('sse error', err));
    for (const kind of ['invalidate', 'toast', 'update'] satisfies SseMessageKind[]) {
      eventSource.addEventListener(kind, (event) => {
        const message: SseMessage<typeof kind> = SuperJSON.parse(event.data);
        for (const callback of callbacksRef.current.get(kind) ?? []) callback(message);
      });
    }
    return () => eventSource.close();
  }, []);

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
