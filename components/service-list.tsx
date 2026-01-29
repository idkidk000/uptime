'use client';

import { ChevronDown, ListFilter, Pause, Play } from 'lucide-react';
import Link from 'next/link';
import { type Dispatch, type SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { setPausedMulti } from '@/actions/service';
import { BarGraph } from '@/components/bar-graph';
import { Button } from '@/components/base/button';
import { Card } from '@/components/base/card';
import { InputText } from '@/components/base/input-text';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/base/popover';
import { StatusBadge } from '@/components/status-badge';
import { useAppQueries, useServicesWithState } from '@/hooks/app-queries';
import { ServiceStatus, type ServiceWithState } from '@/lib/drizzle/schema';
import { cn, enumEntries } from '@/lib/utils';

interface Filter {
  search: string | null;
  status: ServiceStatus[];
  active: boolean[];
}

function FilterStateButton({
  filter,
  setFilter,
  label,
  status,
}: {
  filter: Filter;
  setFilter: Dispatch<SetStateAction<Filter>>;
  label: string;
  status: ServiceStatus;
}) {
  // biome-ignore lint/correctness/useExhaustiveDependencies(setFilter): state setters are stable
  const handleClick = useCallback(() => {
    setFilter((prev) => ({
      ...prev,
      status: prev.status.includes(status) ? prev.status.filter((item) => item !== status) : [...prev.status, status],
    }));
  }, [status]);

  return (
    <Button variant={filter.status.includes(status) ? 'up' : 'muted'} onClick={handleClick} className='py-0'>
      {label}
    </Button>
  );
}

function FilterActiveButton({
  filter,
  setFilter,
  active,
}: {
  filter: Filter;
  setFilter: Dispatch<SetStateAction<Filter>>;
  active: boolean;
}) {
  // biome-ignore lint/correctness/useExhaustiveDependencies(setFilter): state setters are stable
  const handleClick = useCallback(() => {
    setFilter((prev) => ({
      ...prev,
      active: prev.active.includes(active) ? prev.active.filter((item) => item !== active) : [...prev.active, active],
    }));
  }, [active]);

  return (
    <Button variant={filter.active.includes(active) ? 'up' : 'muted'} onClick={handleClick} className='py-0'>
      {(active && 'Active') || 'Paused'}
    </Button>
  );
}

function ServiceListItem({
  id,
  state,
  name,
  selection,
  setSelection,
}: ServiceWithState & { selection: number[] | null; setSelection: Dispatch<SetStateAction<number[] | null>> }) {
  // biome-ignore lint/correctness/useExhaustiveDependencies(setSelection): state setters are stable
  const handleCheckChange = useCallback(
    () =>
      setSelection((prev) =>
        prev === null ? null : prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      ),
    [id]
  );

  return (
    <li key={id} className={cn('grid grid-cols-subgrid col-start-2', selection === null ? 'col-span-3' : 'col-span-4')}>
      {selection !== null && (
        <input type='checkbox' checked={selection?.includes(id) ?? false} onChange={handleCheckChange} />
      )}
      <Link href={`/dashboard/${id}`} className='grid grid-cols-subgrid items-center col-span-3'>
        <StatusBadge
          size='sm'
          status={state?.status}
          className='me-auto'
          suppressHydrationWarning
        >{`${typeof state?.uptime1d === 'number' ? Math.round(state?.uptime1d) : '0'}%`}</StatusBadge>
        <h4 className='shrink-0 me-auto'>{name}</h4>
        <BarGraph history={state?.miniHistory} />
      </Link>
    </li>
  );
}

export function ServiceList() {
  const services = useServicesWithState();
  const { groups } = useAppQueries();
  const [filter, setFilter] = useState<Filter>({ active: [], search: null, status: [] });
  const [selection, setSelection] = useState<number[] | null>(null);
  const selectionRef = useRef(selection);
  const servicesRef = useRef(services);

  useEffect(() => {
    selectionRef.current = selection;
  }, [selection]);
  useEffect(() => {
    servicesRef.current = services;
  }, [services]);

  const handleSelectClick = useCallback(() => setSelection((prev) => (prev === null ? [] : null)), []);

  const handleSearchChange = useCallback((search: string) => {
    setFilter((prev) => ({ ...prev, search: search || null }));
  }, []);

  const handleClearFilterClick = useCallback(() => setFilter({ active: [], search: null, status: [] }), []);

  const handleSelectAllClick = useCallback(
    () =>
      setSelection((prev) => (prev === null ? null : prev.length ? [] : servicesRef.current.map((item) => item.id))),
    []
  );

  const handlePauseSelectionClick = useCallback(() => {
    if (!selectionRef.current?.length) return;
    void setPausedMulti(selectionRef.current, true);
    setSelection(null);
  }, []);

  const handleResumeSelectionClick = useCallback(() => {
    if (!selectionRef.current?.length) return;
    void setPausedMulti(selectionRef.current, false);
    setSelection(null);
  }, []);

  const groupsWithServices = useMemo(() => {
    const visibleServices = services
      .filter(
        (service) =>
          (filter.active.length === 0 || filter.active.includes(service.active)) &&
          (filter.status.length === 0 || (filter.status as number[]).includes(service.state?.status ?? -1)) &&
          (filter.search === null || service.name.toLocaleLowerCase().includes(filter.search.toLocaleLowerCase()))
      )
      .toSorted((a, b) => a.name.localeCompare(b.name));

    return groups
      .toSorted((a, b) => a.name.localeCompare(b.name))
      .map((group) => ({ ...group, services: visibleServices.filter((service) => service.groupId === group.id) }))
      .filter((group) => group.services.length);
  }, [filter, groups, services]);

  return (
    <Card className='p-0 flex flex-col overflow-hidden'>
      <section className='bg-background-head p-4 flex flex-col gap-2'>
        <div className='flex justify-between'>
          <Button variant='muted' onClick={handleSelectClick}>
            Select
          </Button>
          <InputText
            onValueChange={handleSearchChange}
            type='search'
            placeholder='Search'
            value={filter.search ?? ''}
          />
        </div>
        <div className='flex gap-2'>
          <Button
            variant='muted'
            // aspect-square doesn't work in chromium
            className={cn((filter.active.length || filter.search !== null || filter.status.length) && 'border-up')}
            size='icon'
            onClick={handleClearFilterClick}
          >
            <ListFilter />
          </Button>
          <Popover>
            <PopoverTrigger variant='muted' className={filter.status.length ? 'border-up' : undefined}>
              Status
              <ChevronDown />
            </PopoverTrigger>
            <PopoverContent className='open:flex flex-col gap-2'>
              {enumEntries(ServiceStatus).map(([label, status]) => (
                <FilterStateButton key={status} filter={filter} label={label} setFilter={setFilter} status={status} />
              ))}
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger variant='muted' className={filter.active.length ? 'border-up' : undefined}>
              Active
              <ChevronDown />
            </PopoverTrigger>
            <PopoverContent className='open:flex flex-col gap-2'>
              {[true, false].map((active) => (
                <FilterActiveButton key={Number(active)} active={active} filter={filter} setFilter={setFilter} />
              ))}
            </PopoverContent>
          </Popover>
          <Button variant='muted'>Tags</Button>
        </div>
        {selection !== null && (
          <div className={cn('flex gap-2 items-center transition-in-right')}>
            <input type='checkbox' checked={selection?.length > 0} onChange={handleSelectAllClick} />
            <Button variant='muted' onClick={handlePauseSelectionClick}>
              <Pause />
              Pause
            </Button>
            <Button variant='muted' onClick={handleResumeSelectionClick}>
              <Play />
              Resume
            </Button>
            <span className='text-foreground/75'>{`${selection?.length ?? 0} selected`}</span>
          </div>
        )}
      </section>
      <ul
        //TODO: transition height on filter
        className={cn(
          'grid p-4 overflow-y-auto gap-4',
          selection === null ? 'grid-cols-[auto_auto_auto_1fr]' : 'grid-cols-[auto_auto_auto_auto_1fr]'
        )}
      >
        {groupsWithServices.map((group) => {
          return (
            <div className='contents' key={group.id}>
              <li className='col-span-full font-semibold'>{group.name}</li>
              {group.services.map((service) => (
                <ServiceListItem key={service.id} {...service} selection={selection} setSelection={setSelection} />
              ))}
            </div>
          );
        })}
      </ul>
    </Card>
  );
}
