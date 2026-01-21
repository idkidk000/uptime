import { type ComponentProps, useCallback, useEffect, useRef, useState } from 'react';
import { Button, ButtonGroup } from '@/components/button';
import { Card } from '@/components/card';
import { StateBadge } from '@/components/state-badge';
import { useServiceHistory } from '@/hooks/app-queries';
import { toLocalIso } from '@/lib/date';
import { MonitorDownReason } from '@/lib/monitor';
import { enumToObject } from '@/lib/utils';

const reasonNames = enumToObject(MonitorDownReason);

export function HistoryCard({
  serviceId,
  className,
  children,
  ...props
}: { serviceId: number | null } & ComponentProps<typeof Card>) {
  const [pageNum, setPageNum] = useState(0);
  const history = useServiceHistory(serviceId, pageNum);
  const pagesRef = useRef(1);

  useEffect(() => {
    pagesRef.current = history?.pages ?? 1;
  }, [history]);

  const handlePageDownClick = useCallback(() => setPageNum((prev) => Math.max(prev - 1, 0)), []);
  const handlePageUpClick = useCallback(() => setPageNum((prev) => Math.min(prev + 1, pagesRef.current - 1)), []);

  return (
    <Card className={`flex flex-col gap-4`} {...props}>
      {children}
      <div
        className={`grid gap-4 ${serviceId === null ? 'grid-cols-[auto_auto_auto_1fr]' : 'grid-cols-[auto_auto_1fr]'}`}
      >
        <div className='contents font-semibold'>
          {serviceId === null && <h4>Name</h4>}
          <h4>State</h4>
          <h4>At</h4>
          <h4>Message</h4>
        </div>
        {history?.data.map((item) => (
          <div className='contents' key={item.id}>
            {serviceId === null && <span>{item.name}</span>}
            <StateBadge state={item.state} size='sm' className='me-auto' />
            <span>{toLocalIso(item.createdAt, { endAt: 's' })}</span>
            <span>
              {item.result === null
                ? 'Paused'
                : item.result.ok
                  ? 'OK'
                  : `${reasonNames[item.result.reason]}: ${item.result.result}`}
            </span>
          </div>
        ))}
      </div>
      <ButtonGroup className='mx-auto'>
        <Button onClick={handlePageDownClick} disabled={!history || pageNum <= 0}>
          back
        </Button>
        <Button onClick={handlePageUpClick} disabled={!history || pageNum >= history.pages - 1}>
          forward
        </Button>
      </ButtonGroup>
    </Card>
  );
}
