import { ChevronDown, ListFilter } from 'lucide-react';
import Link from 'next/link';
import { type Dispatch, type SetStateAction, useCallback, useState } from 'react';
import { BarGraph } from '@/components/bar-graph';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { InputText } from '@/components/input-text';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/popover';
import { StateBadge } from '@/components/state-badge';
import { useServicesWithState } from '@/hooks/app-queries';
import { ServiceState } from '@/lib/drizzle/schema';
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
  const handleClick = useCallback(() => {
    setFilter((prev) => ({
      ...prev,
      state: prev.state.includes(state) ? prev.state.filter((item) => item !== state) : [...prev.state, state],
    }));
  }, [setFilter, state]);
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
  const handleClick = useCallback(() => {
    setFilter((prev) => ({
      ...prev,
      active: prev.active.includes(active) ? prev.active.filter((item) => item !== active) : [...prev.active, active],
    }));
  }, [setFilter, active]);
  return (
    <Button size='sm' variant={filter.active.includes(active) ? 'up' : 'muted'} onClick={handleClick}>
      {(active && 'Active') || 'Paused'}
    </Button>
  );
}

// TODO: groups
export function ServiceList() {
  const services = useServicesWithState();
  const [filter, setFilter] = useState<Filter>({ active: [], search: null, state: [] });

  const handleSearchChange = useCallback((search: string) => {
    setFilter((prev) => ({ ...prev, search: search || null }));
  }, []);

  const handleClearFilterClick = useCallback(() => setFilter({ active: [], search: null, state: [] }), []);

  return (
    <Card className='p-0 flex flex-col overflow-hidden'>
      <h3 className='bg-background-head p-4 flex flex-col gap-2'>
        <div className='flex justify-between'>
          <Button variant='muted'>Select</Button>
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
            className={cn(
              'aspect-square justify-center',
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
            <PopoverContent className='flex flex-col gap-2'>
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
            <PopoverContent className='flex flex-col gap-2'>
              {[true, false].map((active) => (
                <FilterActiveButton key={Number(active)} active={active} filter={filter} setFilter={setFilter} />
              ))}
            </PopoverContent>
          </Popover>
          <Button variant='muted'>Tags</Button>
        </div>
      </h3>
      <ul className='grid grid-cols-[auto_auto_1fr] p-4 overflow-y-auto gap-4'>
        {services
          .filter(
            (service) =>
              (filter.active.length === 0 || filter.active.includes(service.active)) &&
              (filter.state.length === 0 || (filter.state as number[]).includes(service.state?.value ?? -1)) &&
              (filter.search === null || service.name.toLocaleLowerCase().includes(filter.search.toLocaleLowerCase()))
          )
          .map((service) => (
            <li key={service.id} className='col-span-3 grid grid-cols-subgrid'>
              <Link href={`/dashboard/${service.id}`} className='col-span-3 grid grid-cols-subgrid items-center'>
                <StateBadge
                  size='sm'
                  state={service.state?.value}
                  className='me-auto'
                >{`${typeof service.state?.uptime1d === 'number' ? Math.round(service.state?.uptime1d) : '0'}%`}</StateBadge>
                <h4 className='shrink-0 me-auto'>{service.name}</h4>
                <BarGraph history={service.state?.miniHistory} />
              </Link>
            </li>
          ))}
      </ul>
    </Card>
  );
}
