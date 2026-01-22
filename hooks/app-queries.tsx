'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, type ReactNode, useContext, useEffect, useEffectEvent, useMemo } from 'react';
import SuperJSON from 'superjson';
import { getGroups } from '@/actions/group';
import { getServiceHistory } from '@/actions/history';
import { getServices } from '@/actions/service';
import { getServiceStates, getStateCounts, type StateCounts } from '@/actions/state';
import type { Invalidation, Update } from '@/app/api/sse/route';
import type { GroupSelect, ServiceSelect, ServiceWithState, StateSelect } from '@/lib/drizzle/schema';

interface Context {
  groups: GroupSelect[];
  services: ServiceSelect[];
  states: StateSelect[];
  stateCounts: StateCounts;
}

/*
  generally, query keys are:
    [ InvalidationKind ] if they contain all the data for all items - e.g. groupsQuery
    [ InvalidationKind, id:number ] if they contain data for a single id
    [ InvalidationKind, 'meta', unique?:string ] if they contain some kind of aggregates which should always be invalidated whenever an id of that type is invalidated

  sse sends type `Update` for 'group', 'service-config', and 'service-state' kinds. this includes the new data, which is patched into the Tanstack Query cache by `handleUpdate`. the `meta` subkeys are invalidated and will then be refetched by Tanstack Query when needed

  'service-history' is a special case since it is never fully fetched - it's selected by service id or all, filtered server-side for only state changes, and paginated. so for these, sse sends down an `Invalidation` type and the entire query key is invalidated. Tanstack Query will then refetch data when it's needed

  query defaults to prevent auto refetching etc are set on the `QueryClientProvider` in `layout-client.tsx`

  query default data is passed down from layout.tsx to prevent loading pop-in
*/

const Context = createContext<Context | null>(null);

// named this way to prevent confusion with react-query

// TODO: move SSE to a separate hook so that toasts can also use it
export function AppQueriesProvider({
  children,
  groups,
  services,
  states,
  stateCounts,
}: {
  children: ReactNode;
  groups: GroupSelect[];
  services: ServiceSelect[];
  states: StateSelect[];
  stateCounts: StateCounts;
}) {
  const queryClient = useQueryClient();

  const groupsQuery = useQuery({
    queryKey: ['group'],
    queryFn: () => getGroups(),
    initialData: groups,
  });

  const servicesQuery = useQuery({
    queryKey: ['service-config'],
    queryFn: () => getServices(),
    initialData: services,
  });

  const statesQuery = useQuery({
    queryKey: ['service-state'],
    queryFn: () => getServiceStates(),
    initialData: states,
  });

  const stateCountsQuery = useQuery({
    queryKey: ['service-state', 'meta', 'counts'],
    queryFn: () => getStateCounts(),
    initialData: stateCounts,
  });

  const value: Context = useMemo(
    () => ({
      groups: groupsQuery.data,
      services: servicesQuery.data,
      states: statesQuery.data,
      stateCounts: stateCountsQuery.data,
    }),
    [groupsQuery, servicesQuery, statesQuery, stateCountsQuery.data]
  );

  const handleInvalidation = useEffectEvent((invalidation: Invalidation) => {
    console.debug('sse invalidate', invalidation);
    for (const subkey of ['meta', ...invalidation.ids])
      queryClient.invalidateQueries({ queryKey: [invalidation.kind, subkey] });
  });

  const handleUpdate = useEffectEvent((update: Update) => {
    console.debug('sse update', update);
    queryClient.invalidateQueries({ queryKey: [update.kind, 'meta'] });
    // https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation#query-matching-with-invalidatequeries
    // if prev is undefined, query is unfetched (should only happen in dev while i'm actively changing the source). trigger a refetch and return undefined to prevent setting data
    queryClient.setQueryData([update.kind], (prev: { id: number }[] | undefined) => {
      if (Array.isArray(prev)) return [...prev.filter((item) => !update.ids.includes(item.id)), ...update.data];
      queryClient.refetchQueries({ queryKey: [update.kind] });
    });
  });

  useEffect(() => {
    const eventSource = new EventSource('/api/sse');
    eventSource.addEventListener('error', (err) => console.error('sse error', err));
    eventSource.addEventListener('open', (event) => console.debug('sse open', event));
    eventSource.addEventListener('invalidate', (event) => handleInvalidation(SuperJSON.parse(event.data)));
    eventSource.addEventListener('update', (event) => handleUpdate(SuperJSON.parse(event.data)));
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
  const statesMap = new Map((states ?? []).map((item) => [item.id, item]));
  return services.map((item) => ({ ...item, state: statesMap.get(item.id) ?? null }));
}

export function useServiceWithState(id: number | null | undefined): ServiceWithState | null {
  const { services, states } = useAppQueries();
  if (typeof id !== 'number') return null;
  const service = services.find((item) => item.id === id);
  if (!service) return null;
  const state = states.find((item) => item.id === id) ?? null;
  return { ...service, state };
}

// TODO: prefetch next page
export function useServiceHistory(
  serviceId: number | null,
  page?: number
): Awaited<ReturnType<typeof getServiceHistory>> | null {
  const query = useQuery({
    queryKey: ['service-history', serviceId ?? 'meta', { page }],
    queryFn: () => getServiceHistory(serviceId, { page: page }),
  });
  return query.data ?? null;
}
