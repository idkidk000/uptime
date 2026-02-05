'use client';

import { Copy, Pause, Play, ShieldQuestion, SquarePen, Trash } from 'lucide-react';
import Link from 'next/link';
import { redirect, useParams } from 'next/navigation';
import { useCallback, useEffect } from 'react';
import { clearServiceHistory } from '@/actions/history';
import { checkService, deleteService, togglePaused } from '@/actions/service';
import { Badge } from '@/components/badge';
import { BarGraph } from '@/components/bar-graph';
import { Button, ButtonGroup } from '@/components/button';
import { Card } from '@/components/card';
import { ConfirmModal, ConfirmModalTrigger } from '@/components/confirm-modal';
import { HistoryCard } from '@/components/history-card';
import { PageWrapper } from '@/components/page-wrapper';
import { StatusBadge } from '@/components/status-badge';
import { useServiceWithState } from '@/hooks/app-queries';
import { useToast } from '@/hooks/toast';
import { toDuration, toLocalIso } from '@/lib/date';
import { ServiceStatus } from '@/lib/types';

const REDIRECT_MILLIS = 3_000;

export default function DetailPage() {
  const { id } = useParams();
  const numId = Number(id);
  const service = useServiceWithState(numId);
  const { showToast } = useToast();

  // biome-ignore format: no
  const handlePausedClick = useCallback(() =>
    togglePaused(numId).then((response) => {
      if (!response.ok) showToast('Error toggling paused', `${response.error}`, ServiceStatus.Down);
    }),
  [numId]);

  // biome-ignore format: no
  const handleClearHistoryClick = useCallback(() =>
    clearServiceHistory(numId).then((response) => {
      if (!response.ok) showToast('Error clearing history', `${response.error}`, ServiceStatus.Down);
    }),
  [numId]);

  // biome-ignore format: no
  const handleCheckClick = useCallback(() =>
    checkService(numId).then((response) => {
      if (!response.ok) showToast('Error checking service', `${response.error}`, ServiceStatus.Down);
    }),
  [numId]);

  // biome-ignore format: no
  const handleDeleteClick = useCallback(() =>
    deleteService(numId).then((response) => {
      if (!response.ok) showToast('Error deleting service', `${response.error}`, ServiceStatus.Down);
    }),
  [numId]);

  useEffect(() => {
    if (service) return;
    const timeout = setTimeout(() => redirect('/dashboard'), REDIRECT_MILLIS);
    return () => clearTimeout(timeout);
  }, [service]);

  if (!service) return <div className='text-down text-2xl'>Could not find a service with id {JSON.stringify(id)}</div>;

  return (
    <PageWrapper pageTitle={service.name}>
      <Card variant='ghost' className='flex flex-col gap-4'>
        {(service.params.kind === 'http' && (
          <a className='font-semibold text-up' href={service.params.address} target='_blank'>
            {service.params.address}
          </a>
        )) || (
          <span className='font-semibold text-up'>{`${service.params.kind}: ${'recordType' in service.params ? `${service.params.recordType}: ` : ''}${service.params.address}${'port' in service.params ? `:${service.params.port}` : ''}`}</span>
        )}
        {!!service.tags.length && (
          <span className='flex gap-4'>
            {service.tags.map((tag) => (
              <Badge size='sm' key={tag.id} variant='muted'>
                {tag.name}
              </Badge>
            ))}
          </span>
        )}
        <ConfirmModal message={`Are you sure you want to delete ${service.name}?`} onConfirm={handleDeleteClick}>
          <ButtonGroup className='max-md:*:px-0 max-md:*:grow'>
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
      </Card>
      <Card className='flex flex-col gap-2'>
        <div className='flex gap-4 justify-between items-start'>
          <BarGraph history={service.state?.miniHistory} withLabels />
          <StatusBadge status={service.state?.status} />
        </div>
        <div className='flex gap-4 justify-between'>
          <span className='text-foreground/75'>{`Check every ${toDuration(service.checkSeconds * 1000)}`}</span>
          <span className='text-foreground/75'>{`Since ${toLocalIso(service.state?.changedAt, { endAt: 's' })}`}</span>
        </div>
      </Card>
      <Card className='grid grid-cols-4 grid-rows-[auto_auto_auto] text-center items-center gap-2 grid-flow-col'>
        <div className='contents'>
          <h4 className='text-xl'>Response</h4>
          <span className='text-xs text-foreground/50'>(Current)</span>
          <span>{`${service.state?.miniHistory.items.at(-1)?.latency ?? '-'} ms`}</span>{' '}
        </div>
        <div className='contents'>
          <h4 className='text-xl'>Avg Response</h4>
          <span className='text-xs text-foreground/50'>(24-hour)</span>
          <span>{`${service.state?.latency1d ?? '-'} ms`}</span>
        </div>
        <div className='contents'>
          <h4 className='text-xl'>Uptime</h4>
          <span className='text-xs text-foreground/50'>(24-hour)</span>
          <span>{`${service.state?.uptime1d ?? '-'} %`}</span>
        </div>
        <div className='contents'>
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
