'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, type ReactNode, useContext, useEffect, useEffectEvent, useMemo } from 'react';
import SuperJSON from 'superjson';
import { getGroups } from '@/actions/group';
import { getServiceHistory } from '@/actions/history';
import { getServices } from '@/actions/service';
import { getServiceStates, getStateCounts } from '@/actions/state';
import type { Invalidations } from '@/app/api/sse/route';
import type { GroupSelect, ServiceSelect, ServiceWithState, StateSelect } from '@/lib/drizzle/schema';

interface Context {
  groups: GroupSelect[];
  services: ServiceSelect[];
  states: StateSelect[];
}

const Context = createContext<Context | null>(null);

// named this way to prevent confusion with react-query

export function AppQueriesProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const groupsQuery = useQuery({
    queryKey: ['group'],
    queryFn: () => getGroups(),
  });

  const servicesQuery = useQuery({
    queryKey: ['service-config'],
    queryFn: () => getServices(),
  });

  const statesQuery = useQuery({
    queryKey: ['service-state'],
    queryFn: () => getServiceStates(),
  });

  const value: Context = useMemo(
    () => ({
      groups: groupsQuery?.data ?? [],
      services: servicesQuery?.data ?? [],
      states: statesQuery?.data ?? [],
    }),
    [groupsQuery, servicesQuery, statesQuery]
  );

  // FIXME: update sse to pass down the record, then patch the queries directly
  const handleInvalidation = useEffectEvent((invalidations: Invalidations) => {
    for (const key of invalidations.keys()) queryClient.invalidateQueries({ queryKey: [key] });
  });

  useEffect(() => {
    const eventSource = new EventSource('/api/sse');
    eventSource.addEventListener('error', (err) => console.error('sse error', err));
    eventSource.addEventListener('open', (event) => console.debug('sse open', event));
    eventSource.addEventListener('invalidate', (event) => {
      console.debug('sse invalidate', event);
      handleInvalidation(SuperJSON.parse(event.data));
    });
    eventSource.addEventListener('message', (event) => console.debug('sse message', event));
    return () => eventSource.close();
  }, []);

  return <Context value={value}>{children}</Context>;
}

export function useAppQueries(): Context {
  const context = useContext(Context);
  if (context === null) throw new Error('useAppQueries must be used underneath an AppQueriesProvider');
  return context;
}

export function useServicesWithState(): ServiceWithState[] {
  const { services, states } = useAppQueries();
  if (!services) return [];
  const statesMap = new Map((states ?? []).map((item) => [item.serviceId, item]));
  return services.map((item) => ({ ...item, state: statesMap.get(item.id) ?? null }));
}

export function useServiceWithState(serviceId: number | null | undefined): ServiceWithState | null {
  const { services, states } = useAppQueries();
  if (typeof serviceId !== 'number') return null;
  const service = services.find((item) => item.id === serviceId);
  if (!service) return null;
  const state = states.find((item) => item.serviceId === serviceId) ?? null;
  return { ...service, state };
}

// TODO: this will still need to be invalidated when i switch over to sse patching for core data
export function useServiceHistory(
  serviceId: number | null,
  pageNum?: number
): Awaited<ReturnType<typeof getServiceHistory>> | null {
  const query = useQuery({
    queryKey: ['service-history', serviceId ?? null, { pageNum }],
    queryFn: () => getServiceHistory(serviceId, { pageNum }),
  });
  return query.data ?? null;
}

// TODO: this will still need to be invalidated when i switch over to sse patching for core data
export function useStateCounts(): Awaited<ReturnType<typeof getStateCounts>> | null {
  const query = useQuery({
    queryKey: ['service-state', 'counts'],
    queryFn: () => getStateCounts(),
  });
  return query.data ?? null;
}
