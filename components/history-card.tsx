'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { type ComponentProps, useCallback, useEffect, useRef, useState } from 'react';
import { Button, ButtonGroup } from '@/components/button';
import { Card } from '@/components/card';
import { StateBadge } from '@/components/state-badge';
import { useServiceHistory } from '@/hooks/app-queries';
import { toLocalIso } from '@/lib/date';
import { monitorDownReasons } from '@/lib/monitor';
import { cn, pascalToSentenceCase } from '@/lib/utils';

export function HistoryCard({
  serviceId,
  className,
  children,
  ...props
}: { serviceId: number | null } & ComponentProps<typeof Card>) {
  const [page, setPage] = useState(0);
  const history = useServiceHistory(serviceId, page);
  const pagesRef = useRef(1);

  useEffect(() => {
    pagesRef.current = history?.pages ?? 1;
  }, [history]);

  const handlePageDownClick = useCallback(() => setPage((prev) => Math.max(prev - 1, 0)), []);
  const handlePageUpClick = useCallback(() => setPage((prev) => Math.min(prev + 1, pagesRef.current - 1)), []);

  return (
    <Card className={cn('flex flex-col gap-4', className)} {...props}>
      {children}
      <div
        className={`grid gap-4 items-start ${serviceId === null ? 'grid-cols-[auto_auto_auto_1fr]' : 'grid-cols-[auto_auto_1fr]'}`}
      >
        <div className='contents font-semibold'>
          {serviceId === null && <h4>Name</h4>}
          <h4>State</h4>
          <h4>At</h4>
          <h4>Message</h4>
        </div>
        {history?.data.map((item) => (
          <div className='contents' key={item.id}>
            {serviceId === null && <Link href={`/dashboard/${item.serviceId}`}>{item.name}</Link>}
            <StateBadge state={item.state} size='sm' className='me-auto' />
            <span>{toLocalIso(item.createdAt, { endAt: 's' })}</span>
            <span>
              {item.result === null
                ? 'Paused'
                : item.result.ok
                  ? 'OK'
                  : `${pascalToSentenceCase(monitorDownReasons[item.result.reason])}: ${item.result.message}`}
            </span>
          </div>
        ))}
      </div>
      <ButtonGroup className='mx-auto'>
        <Button onClick={handlePageDownClick} disabled={!history || page <= 0} size='lg'>
          <ChevronLeft aria-description='Previous page' />
        </Button>
        <Button onClick={handlePageUpClick} disabled={!history || page >= history.pages - 1} size='lg'>
          <ChevronRight aria-description='Next page' />
        </Button>
      </ButtonGroup>
    </Card>
  );
}
