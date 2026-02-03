'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, type ReactNode, type RefObject, useContext, useEffect, useMemo, useRef } from 'react';
import { getGroups } from '@/actions/group';
import type { GroupSelectWithNotifiers } from '@/actions/group/schema';
import { getServiceHistory } from '@/actions/history';
import { getNotifiers } from '@/actions/notifier';
import { getServices, type ServiceSelectWithTagIds } from '@/actions/service';
import { getSettings } from '@/actions/setting';
import { getServiceStates, getStatusCounts, type StatusCounts } from '@/actions/state';
import { getTags } from '@/actions/tag';
import { useLogger } from '@/hooks/logger';
import { useSse } from '@/hooks/sse';
import type { NotifierSelect, ServiceWithState, StateSelect, TagSelect } from '@/lib/drizzle/zod/schema';
import type { Settings } from '@/lib/settings/schema';

interface Context {
  groups: GroupSelectWithNotifiers[];
  services: ServiceSelectWithTagIds[];
  states: StateSelect[];
  statusCounts: StatusCounts;
  settings: Settings;
  settingsRef: RefObject<Settings>;
  notifiers: NotifierSelect[];
  tags: TagSelect[];
}

/*
  generally, query keys are:
    [ InvalidationKind ] if they contain all the data for all items - e.g. groupsQuery
    [ InvalidationKind, id:number ] if they contain data for a single id
    [ InvalidationKind, 'meta', unique?:string ] if they contain some kind of aggregates which should always be invalidated whenever an id of that type is invalidated

  sse sends type `Update` for 'group', 'service-config', and 'service-state' kinds. this includes the new data, which is patched into the Tanstack Query cache by `handleUpdate`. the `meta` subkeys are invalidated and will then be refetched by Tanstack Query when needed

  'service-history' is a special case since it is never fully fetched - it's selected by service id or all, filtered server-side for only state (status, result kind, result message) changes, and paginated. so for these, sse sends down an `Invalidation` type and the entire query key is invalidated. Tanstack Query will then refetch data when it's needed

  query defaults to prevent auto refetching etc are set on the `QueryClientProvider` in `layout-client.tsx`

  query default data is passed down from layout.tsx to prevent loading pop-in
*/

const Context = createContext<Context | null>(null);

// named this way to prevent confusion with react-query

export function AppQueriesProvider({
  children,
  groups,
  services,
  states,
  statusCounts,
  settings,
  notifiers,
  tags,
}: {
  children: ReactNode;
  groups: GroupSelectWithNotifiers[];
  services: ServiceSelectWithTagIds[];
  states: StateSelect[];
  statusCounts: StatusCounts;
  settings: Settings;
  notifiers: NotifierSelect[];
  tags: TagSelect[];
}) {
  const queryClient = useQueryClient();
  const logger = useLogger(import.meta.url);
  const { subscribe } = useSse();

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

  const statusCountsQuery = useQuery({
    queryKey: ['service-state', 'meta', 'counts'],
    queryFn: () => getStatusCounts(),
    initialData: statusCounts,
  });

  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: () => getSettings(),
    initialData: settings,
  });

  const notifiersQuery = useQuery({
    queryKey: ['notifier'],
    queryFn: () => getNotifiers(),
    initialData: notifiers,
  });

  const tagsQuery = useQuery({
    queryKey: ['tag'],
    queryFn: () => getTags(),
    initialData: tags,
  });

  const settingsRef = useRef(settingsQuery.data);

  useEffect(() => {
    settingsRef.current = settingsQuery.data;
  }, [settingsQuery.data]);

  const value: Context = useMemo(
    () => ({
      groups: groupsQuery.data,
      services: servicesQuery.data,
      states: statesQuery.data,
      statusCounts: statusCountsQuery.data,
      settings: settingsQuery.data,
      settingsRef,
      notifiers: notifiersQuery.data,
      tags: tagsQuery.data,
    }),
    [
      groupsQuery.data,
      servicesQuery.data,
      statesQuery.data,
      statusCountsQuery.data,
      settingsQuery.data,
      notifiersQuery.data,
      tagsQuery.data,
    ]
  );

  useEffect(() => {
    const unsubscribers = [
      subscribe('invalidate', (message) => {
        logger.debugLow('sse invalidate', message);
        // refetch active queries and mark inactive as stale. those inactive queries will then be refetched on render according to default settings in layout-client.tsx
        for (const subkey of ['meta', ...message.ids])
          queryClient.invalidateQueries({ queryKey: [message.kind, subkey] });
      }),
      subscribe('update', (message) => {
        logger.debugLow('sse update', message);
        queryClient.invalidateQueries({ queryKey: [message.kind, 'meta'] });
        // https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation#query-matching-with-invalidatequeries
        // if prev is undefined, query is unfetched (should only happen in dev while i'm actively changing the source). trigger a refetch and return undefined to prevent setting data
        if (message.kind === 'settings') queryClient.setQueryData([message.kind], message.data);
        else
          queryClient.setQueryData([message.kind], (prev: { id: number }[] | undefined) => {
            if (Array.isArray(prev)) return [...prev.filter((item) => !message.ids.includes(item.id)), ...message.data];
            queryClient.refetchQueries({ queryKey: [message.kind] });
          });
      }),
      subscribe('reconnect', () => {
        // invalidate everything
        queryClient.invalidateQueries();
      }),
    ];
    return () => void unsubscribers.map((fn) => fn());
  }, []);

  return <Context value={value}>{children}</Context>;
}

export function useAppQueries(): Context {
  const context = useContext(Context);
  if (context === null) throw new Error('useAppQueries must be used underneath an AppQueriesProvider');
  return context;
}

export interface ServiceWithStateAndTags extends ServiceWithState {
  tags: TagSelect[];
}

export function useServicesWithState(): ServiceWithStateAndTags[] {
  const { services, states, tags } = useAppQueries();
  const statesMap = useMemo(() => new Map((states ?? []).map((item) => [item.id, item])), [states]);
  const tagsMap = useMemo(() => new Map((tags ?? []).map((item) => [item.id, item])), [tags]);
  return useMemo(() => {
    if (!services) return [];
    return services.map((item) => ({
      ...item,
      state: statesMap.get(item.id) ?? null,
      tags: item.tags.map((id) => tagsMap.get(id)).filter((tag) => typeof tag !== 'undefined'),
    }));
  }, [services, statesMap, tagsMap]);
}

export function useServiceWithState(id: number | null | undefined): ServiceWithStateAndTags | undefined {
  const { services, states, tags } = useAppQueries();
  const result = useMemo(() => {
    if (typeof id !== 'number') return;
    const service = services.find((item) => item.id === id);
    if (!service) return;
    const state = states.find((item) => item.id === id) ?? null;
    const serviceTags = tags.filter((item) => service.tags.includes(item.id));
    return { ...service, state, tags: serviceTags };
  }, [id, services, states, tags]);
  return result;
}

export function useServiceHistory(
  serviceId: number | null,
  page?: number
): Awaited<ReturnType<typeof getServiceHistory>> | null {
  const query = useQuery({
    queryKey: ['service-history', serviceId ?? 'meta', { page }],
    queryFn: () => getServiceHistory(serviceId, { page: page }),
  });
  // docs show to use `usePrefetchQuery` here, but next complains i'm setting state in a render function. calling the method on the queryClient inside a timeout is a workaround
  const client = useQueryClient();
  if (typeof page === 'number' && typeof query.data?.pages === 'number' && page < query.data.pages - 1)
    setTimeout(() =>
      client.prefetchQuery({
        queryKey: ['service-history', serviceId ?? 'meta', { page: page + 1 }],
        queryFn: () => getServiceHistory(serviceId, { page: page + 1 }),
      })
    );
  return query.data ?? null;
}
