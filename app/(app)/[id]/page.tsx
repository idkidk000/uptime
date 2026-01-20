'use client';

import { useParams } from 'next/navigation';
import { useCallback } from 'react';
import { checkService, togglePaused } from '@/actions/service';
import { BarGraph } from '@/components/bar-graph';
import { Button, ButtonGroup } from '@/components/button';
import { Card } from '@/components/card';
import { StateBadge } from '@/components/state-badge';
import { useServiceHistory, useServiceWithState } from '@/hooks/app-queries';
import { toLocalIso } from '@/lib/date';
import { ServiceState } from '@/lib/drizzle/schema';
import { HttpMonitorDownReason } from '@/lib/monitor/http';
import { enumEntries } from '@/lib/utils';

const stateNames = enumEntries(ServiceState);
// FIXME: this enum needs to be common to all monitors
const reasonNames = enumEntries(HttpMonitorDownReason);

export default function Home() {
  const { id } = useParams();
  const service = useServiceWithState(Number(id));
  const history = useServiceHistory(Number(id));

  const handlePausedClick = useCallback(() => togglePaused(Number(id)), [id]);

  if (!service) return <div className='text-down text-2xl'>Could not find a service with id {JSON.stringify(id)}</div>;

  return (
    <section className='flex flex-col gap-4'>
      <h2 className='text-2xl font-semibold'>{service.name}</h2>
      <h3 className='font-semibold text-up'>{`${service.params.kind}: ${service.params.url}`}</h3>
      <ButtonGroup>
        <Button variant='muted' onClick={handlePausedClick}>
          {service.active ? 'Pause' : 'Resume'}
        </Button>
        <Button variant='muted'>Edit</Button>
        <Button variant='muted'>Clone</Button>
        <Button variant='down'>Delete</Button>
        <Button variant='muted' onClick={() => checkService(service.id)}>
          Check
        </Button>
      </ButtonGroup>
      <Card className='flex flex-col gap-2'>
        <div className='flex gap-4 justify-between items-start'>
          <BarGraph history={service.state?.historySummary} showLabels />
          <StateBadge state={service.state?.value} />
        </div>
        <span className='text-foreground/75'>{`Check every ${service.checkSeconds} seconds`}</span>
      </Card>
      <Card className='grid grid-cols-4 text-center'>
        <div className='flex flex-col gap-2'>
          <h4 className='text-xl'>Response</h4>
          <span className='text-xs text-foreground/50'>(Current)</span>
          <span>{`${service.state?.historySummary?.at(0)?.latency ?? '-'} ms`}</span>
        </div>
        <div className='flex flex-col gap-2'>
          <h4 className='text-xl'>Avg Response</h4>
          <span className='text-xs text-foreground/50'>(24-hour)</span>
          <span>{`${service.state?.latency1d ?? '-'} ms`}</span>
        </div>
        <div className='flex flex-col gap-2'>
          <h4 className='text-xl'>Uptime</h4>
          <span className='text-xs text-foreground/50'>(24-hour)</span>
          <span>{`${service.state?.uptime1d ?? '-'} %`}</span>
        </div>
        <div className='flex flex-col gap-2'>
          <h4 className='text-xl'>Uptime</h4>
          <span className='text-xs text-foreground/50'>(30-day)</span>
          <span>{`${service.state?.uptime30d ?? '-'} %`}</span>
        </div>
      </Card>
      <Card className='flex flex-col gap-2'>
        <Button variant='down' className='ms-auto'>
          Clear Data
        </Button>
        <div className='grid grid-cols-[auto_auto_1fr] gap-4'>
          <div className='contents font-semibold'>
            <h4>State</h4>
            <h4>At</h4>
            <h4>Message</h4>
          </div>
          {history?.map((item) => (
            <div className='contents' key={item.id}>
              <span>{stateNames[item.state]}</span>
              <span>{toLocalIso(item.createdAt, { endAt: 's' })}</span>
              <span>{item.result.ok ? 'OK' : `${reasonNames[item.result.reason]}: ${item.result.result}`}</span>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}
