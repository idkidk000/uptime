'use client';

import { Copy, Pause, Play, ShieldQuestion, SquarePen, Trash } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback } from 'react';
import { clearServiceHistory } from '@/actions/history';
import { checkService, deleteService, togglePaused } from '@/actions/service';
import { BarGraph } from '@/components/bar-graph';
import { Button, ButtonGroup } from '@/components/button';
import { Card } from '@/components/card';
import { ConfirmModal, ConfirmModalTrigger } from '@/components/confirm-modal';
import { HistoryCard } from '@/components/history-card';
import { PageWrapper } from '@/components/page-wrapper';
import { StateBadge } from '@/components/state-badge';
import { useServiceWithState } from '@/hooks/app-queries';

export default function DetailPage() {
  const { id } = useParams();
  const numId = Number(id);
  const service = useServiceWithState(numId);

  const handlePausedClick = useCallback(() => togglePaused(numId), [numId]);
  const handleClearHistoryClick = useCallback(() => clearServiceHistory(numId), [numId]);
  const handleCheckClick = useCallback(() => checkService(numId), [numId]);
  const handleDeleteClick = useCallback(() => deleteService(numId), [numId]);

  if (!service) return <div className='text-down text-2xl'>Could not find a service with id {JSON.stringify(id)}</div>;

  return (
    <PageWrapper pageTitle={service.name}>
      {(service.params.kind === 'http' && (
        <a className='font-semibold text-up' href={service.params.address} target='_blank'>
          {service.params.address}
        </a>
      )) || <span className='font-semibold text-up'>{`${service.params.kind}: ${service.params.address}`}</span>}
      <ConfirmModal message={`Are you sure you want to delete ${service.name}?`} onConfirm={handleDeleteClick}>
        <ButtonGroup>
          <Button variant='up' onClick={handleCheckClick}>
            <ShieldQuestion />
            Check
          </Button>
          <Button variant='muted' onClick={handlePausedClick}>
            {service.active ? <Pause /> : <Play />}
            {service.active ? 'Pause' : 'Resume'}
          </Button>
          <Button variant='muted' as={Link} href={`/edit/${id}`}>
            <SquarePen />
            Edit
          </Button>
          <Button variant='muted' as={Link} href={`/clone/${id}`}>
            <Copy />
            Clone
          </Button>
          <ConfirmModalTrigger variant='down'>
            <Trash />
            Delete
          </ConfirmModalTrigger>
        </ButtonGroup>
      </ConfirmModal>
      <Card className='flex flex-col gap-2'>
        <div className='flex gap-4 justify-between items-start'>
          <BarGraph history={service.state?.miniHistory} withLabels />
          <StateBadge state={service.state?.value} />
        </div>
        <span className='text-foreground/75'>{`Check every ${service.checkSeconds} seconds`}</span>
      </Card>
      <Card className='grid grid-cols-4 text-center gap-2'>
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
      <HistoryCard serviceId={numId}>
        <ConfirmModal
          message={`Are you sure you want to delete history for ${service.name}?`}
          onConfirm={handleClearHistoryClick}
        >
          <ConfirmModalTrigger variant='down' className='ms-auto'>
            <Trash />
            Clear Data
          </ConfirmModalTrigger>
        </ConfirmModal>
      </HistoryCard>
    </PageWrapper>
  );
}
