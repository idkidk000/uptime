'use client';

import { ChevronUp, ListFilter, Pause, Play } from 'lucide-react';
import Link from 'next/link';
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { setPausedMulti } from '@/actions/service';
import { Badge } from '@/components/badge';
import { BarGraph } from '@/components/bar-graph';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { InputText } from '@/components/input/input-text';
import { Select } from '@/components/input/select';
import { StatusBadge } from '@/components/status-badge';
import { useAppQueries, useServicesWithState } from '@/hooks/app-queries';
import { ServiceStatus } from '@/lib/types';
import { cn, enumEntries } from '@/lib/utils';

interface Filter {
  search: string | null;
  status: ServiceStatus[];
  tags: number[];
}

export function ServiceList() {
  const { groups, tags } = useAppQueries();
  const services = useServicesWithState();
  const [filter, setFilter] = useState<Filter>({ search: null, status: [], tags: [] });
  const [selection, setSelection] = useState<number[] | null>(null);
  const selectionRef = useRef(selection);
  const servicesRef = useRef(services);
  const ulRef = useRef<HTMLUListElement | null>(null);

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

  const handleClearFilterClick = useCallback(() => setFilter({ search: null, status: [], tags: [] }), []);

  // biome-ignore format: no
  const handleSelectAllClick = useCallback(() =>
    setSelection((prev) => (prev === null ? null : prev.length ? [] : servicesRef.current.map((item) => item.id))),
  []);

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

  // biome-ignore format: no
  const handleStatusFilterChange = useCallback((status: ServiceStatus[]) =>
    setFilter((prev) => ({ ...prev, status })),
  []);

  // biome-ignore format: no
  const handleTagFilterChange = useCallback((tags: number[]) =>
    setFilter((prev) => ({ ...prev, tags })),
  []);

  const handleGroupSelectChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const id = Number(event.currentTarget.dataset.id);
    setSelection((prev) => (prev?.includes(id) ? prev.filter((item) => item !== id) : [...(prev ?? []), id]));
  }, []);

  const handleDetailsToggle = useCallback(() => {
    if (!ulRef.current) return;
    const elems = [...ulRef.current.querySelectorAll<HTMLDetailsElement>('details')];
    if (elems.some((elem) => elem.open)) return;
    elems[0].open = true;
  }, []);

  const groupsWithServices = useMemo(() => {
    const search = filter.search?.toLocaleLowerCase();
    const visibleServices = services
      .filter(
        (service) => filter.status.length === 0 || (filter.status as number[]).includes(service.state?.status ?? -1)
      )
      .toSorted((a, b) => a.name.localeCompare(b.name));

    return groups
      .toSorted((a, b) => a.name.localeCompare(b.name))
      .map((group) => ({
        ...group,
        services: visibleServices.filter(
          (service) =>
            service.groupId === group.id &&
            (typeof search === 'undefined' ||
              group.name.toLocaleLowerCase().includes(search) ||
              service.name.toLocaleLowerCase().includes(search) ||
              service.tags.some((tag) => tag.name.toLocaleLowerCase().includes(search)))
        ),
      }))
      .filter((group) => group.services.length);
  }, [filter, groups, services]);

  return (
    <Card className='p-0 flex-col group' data-select={selection !== null || undefined}>
      <header className='bg-background-head p-4 flex flex-col gap-2 rounded-t-xl'>
        <div className='flex gap-4 justify-between'>
          <Button variant='muted' onClick={handleSelectClick}>
            Select
          </Button>
          <InputText
            onValueChange={handleSearchChange}
            type='search'
            placeholder='Search'
            value={filter.search ?? ''}
            withClear
            size={18}
            className='grow shrink'
          />
        </div>
        <div className='flex gap-2'>
          <Button
            variant='muted'
            className={cn((filter.search !== null || filter.status.length) && 'border-up')}
            size='icon'
            onClick={handleClearFilterClick}
          >
            <ListFilter />
          </Button>
          <Select
            mode='number'
            multi
            onValueChange={handleStatusFilterChange}
            options={enumEntries(ServiceStatus).map(([label, value]) => ({ label, value }))}
            value={filter.status}
            placeholder='Status'
            variant='muted'
            className={cn(filter.status.length && 'border-up')}
            hideValue
          />
          <Select
            mode='number'
            multi
            onValueChange={handleTagFilterChange}
            options={tags.map(({ id, name }) => ({ label: name, value: id }))}
            value={filter.tags}
            placeholder='Tags'
            variant='muted'
            className={cn(filter.tags.length && 'border-up')}
            hideValue
          />
        </div>
        <div className='hidden gap-2 items-center transition-in-right group-data-select:flex'>
          <input type='checkbox' checked={Boolean(selection?.length)} onChange={handleSelectAllClick} />
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
      </header>
      <ul className='flex flex-col gap-2 group p-4 select-none' ref={ulRef}>
        {groupsWithServices.map((group, i) => (
          <li key={group.id}>
            <details
              open={i === 0 || undefined}
              className='group max-h-lh open:max-h-full transion-[max-height] duration-500'
              name='services'
              onToggle={handleDetailsToggle}
            >
              <summary className='font-semibold flex gap-4 -ms-[5px]'>
                <ChevronUp className='in-open:rotate-180 transition-[rotate] duration-150' />
                {group.name}
                <Badge variant='muted' size='sm'>
                  {group.services.length}
                </Badge>
              </summary>
              <ul className='grid grid-cols-[auto_auto_2fr_3fr] gap-4 pt-2'>
                {group.services.map((service) => (
                  <li key={service.id} className='contents'>
                    <input
                      type='checkbox'
                      className='invisible opacity-0 group-data-select:visible group-data-select:opacity-100 transition-[opacity,visibility] transition-discrete duration-150'
                      data-id={service.id}
                      onChange={handleGroupSelectChange}
                      checked={selection?.includes(service.id) ?? false}
                    />
                    <Link href={`/dashboard/${service.id}`} className='contents'>
                      <StatusBadge
                        size='sm'
                        status={service.state?.status}
                        className='me-auto'
                      >{`${typeof service.state?.uptime1d === 'number' ? Math.round(service.state?.uptime1d) : '0'}%`}</StatusBadge>
                      <h4 className='truncate'>{service.name}</h4>
                      {/* TODO: show tags. maybe wrap h4 in an outer and anchor to top right of inner so they can overlap the bar graph */}
                      <BarGraph history={service.state?.miniHistory} className='min-h-lh max-h-lh' />
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          </li>
        ))}
      </ul>
    </Card>
  );
}
