'use client';

import { Copy, Pause, Play, ShieldQuestion, SquarePen, Trash } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useCallback } from 'react';
import { clearServiceHistory } from '@/actions/history';
import { checkService, togglePaused } from '@/actions/service';
import { BarGraph } from '@/components/bar-graph';
import { Button, ButtonGroup } from '@/components/button';
import { Card } from '@/components/card';
import { HistoryCard } from '@/components/history-card';
import { StateBadge } from '@/components/state-badge';
import { useServiceWithState } from '@/hooks/app-queries';

export default function Home() {
  const { id } = useParams();
  const service = useServiceWithState(Number(id));

  const handlePausedClick = useCallback(() => togglePaused(Number(id)), [id]);
  const handleClearHistoryClick = useCallback(() => clearServiceHistory(Number(id)), [id]);

  if (!service) return <div className='text-down text-2xl'>Could not find a service with id {JSON.stringify(id)}</div>;

  return (
    <section className='flex flex-col gap-4'>
      <h2 className='text-2xl font-semibold'>{service.name}</h2>
      <a className='font-semibold text-up' href={service.params.url} target='_blank'>
        {service.params.url}
      </a>
      <ButtonGroup>
        <Button variant='muted' onClick={handlePausedClick}>
          {service.active ? <Pause /> : <Play />}
          {service.active ? 'Pause' : 'Resume'}
        </Button>
        <Button variant='muted'>
          <SquarePen />
          Edit
        </Button>
        <Button variant='muted'>
          <Copy />
          Clone
        </Button>
        <Button variant='down'>
          <Trash />
          Delete
        </Button>
        <Button variant='muted' onClick={() => checkService(service.id)}>
          <ShieldQuestion />
          Check
        </Button>
      </ButtonGroup>
      <Card className='flex flex-col gap-2'>
        <div className='flex gap-4 justify-between items-start'>
          <BarGraph history={service.state?.miniHistory} showLabels />
          <StateBadge state={service.state?.value} />
        </div>
        <span className='text-foreground/75'>{`Check every ${service.checkSeconds} seconds`}</span>
      </Card>
      <Card className='grid grid-cols-4 text-center'>
        <div className='flex flex-col gap-2'>
          <h4 className='text-xl'>Response</h4>
          <span className='text-xs text-foreground/50'>(Current)</span>
          <span>{`${service.state?.miniHistory.items.at(0)?.latency ?? '-'} ms`}</span>
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
      <HistoryCard serviceId={Number(id)}>
        <Button variant='down' className='ms-auto' onClick={handleClearHistoryClick}>
          <Trash />
          Clear Data
        </Button>
      </HistoryCard>
    </section>
  );
}
