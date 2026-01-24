import { ChevronDown, ListFilter, Pause, Play } from 'lucide-react';
import Link from 'next/link';
import { type Dispatch, type SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import { setPausedMulti } from '@/actions/service';
import { BarGraph } from '@/components/bar-graph';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { InputText } from '@/components/input-text';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/popover';
import { StateBadge } from '@/components/state-badge';
import { useServicesWithState } from '@/hooks/app-queries';
import { ServiceState, type ServiceWithState } from '@/lib/drizzle/schema';
import { cn, enumEntries } from '@/lib/utils';

interface Filter {
  search: string | null;
  state: ServiceState[];
  active: boolean[];
}

function FilterStateButton({
  filter,
  setFilter,
  label,
  state,
}: {
  filter: Filter;
  setFilter: Dispatch<SetStateAction<Filter>>;
  label: string;
  state: ServiceState;
}) {
  // biome-ignore lint/correctness/useExhaustiveDependencies(setFilter): state setters are stable
  const handleClick = useCallback(() => {
    setFilter((prev) => ({
      ...prev,
      state: prev.state.includes(state) ? prev.state.filter((item) => item !== state) : [...prev.state, state],
    }));
  }, [state]);

  return (
    <Button size='sm' variant={filter.state.includes(state) ? 'up' : 'muted'} onClick={handleClick}>
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
    <Button size='sm' variant={filter.active.includes(active) ? 'up' : 'muted'} onClick={handleClick}>
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
    <li key={id} className={cn('grid grid-cols-subgrid', selection === null ? 'col-span-3' : 'col-span-4')}>
      {selection !== null && (
        <input type='checkbox' checked={selection?.includes(id) ?? false} onChange={handleCheckChange} />
      )}
      <Link href={`/dashboard/${id}`} className='grid grid-cols-subgrid items-center col-span-3'>
        <StateBadge
          size='sm'
          state={state?.value}
          className='me-auto'
          suppressHydrationWarning
        >{`${typeof state?.uptime1d === 'number' ? Math.round(state?.uptime1d) : '0'}%`}</StateBadge>
        <h4 className='shrink-0 me-auto'>{name}</h4>
        <BarGraph history={state?.miniHistory} />
      </Link>
    </li>
  );
}

// TODO: groups
export function ServiceList() {
  const services = useServicesWithState();
  const [filter, setFilter] = useState<Filter>({ active: [], search: null, state: [] });
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

  const handleClearFilterClick = useCallback(() => setFilter({ active: [], search: null, state: [] }), []);

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
            className={cn(
              'justify-center size-11',
              (filter.active.length || filter.search !== null || filter.state.length) && 'border-up'
            )}
            size='sm'
            onClick={handleClearFilterClick}
          >
            <ListFilter />
          </Button>
          <Popover>
            <PopoverTrigger variant='muted' className={filter.state.length ? 'border-up' : undefined}>
              State
              <ChevronDown />
            </PopoverTrigger>
            <PopoverContent className='open:flex flex-col gap-2'>
              {enumEntries(ServiceState).map(([label, state]) => (
                <FilterStateButton key={state} filter={filter} label={label} setFilter={setFilter} state={state} />
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
          <div
            className={cn(
              'flex gap-2 items-center transition-[scale,opacity] duration-200 overflow-hidden origin-left scale-x-100 opacity-100 starting:scale-x-0 starting:opacity-0'
            )}
          >
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
          selection === null ? 'grid-cols-[auto_auto_1fr]' : 'grid-cols-[auto_auto_auto_1fr]'
        )}
      >
        {services
          .filter(
            (service) =>
              (filter.active.length === 0 || filter.active.includes(service.active)) &&
              (filter.state.length === 0 || (filter.state as number[]).includes(service.state?.value ?? -1)) &&
              (filter.search === null || service.name.toLocaleLowerCase().includes(filter.search.toLocaleLowerCase()))
          )
          .toSorted((a, b) => a.name.localeCompare(b.name))
          .map((service) => (
            <ServiceListItem key={service.id} {...service} selection={selection} setSelection={setSelection} />
          ))}
      </ul>
    </Card>
  );
}
