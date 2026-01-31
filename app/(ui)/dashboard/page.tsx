'use client';

import { Card } from '@/components/card';
import { HistoryCard } from '@/components/history-card';
import { PageWrapper } from '@/components/page-wrapper';
import { useAppQueries } from '@/hooks/app-queries';
import { ServiceStatus, serviceStatuses } from '@/lib/types';
import { typedEntries } from '@/lib/utils';

const statusClasses: Record<ServiceStatus | -1, string> = {
  [ServiceStatus.Up]: 'text-up',
  [ServiceStatus.Down]: 'text-down',
  [ServiceStatus.Pending]: 'text-pending',
  [ServiceStatus.Paused]: 'text-paused',
  [-1]: 'text-unknown',
};

export default function Home() {
  const { statusCounts } = useAppQueries();

  return (
    <PageWrapper pageTitle='Quick Stats'>
      <Card className='grid grid-cols-5 grid-rows-[auto_auto] text-center items-center gap-2 grid-flow-col font-bold'>
        {typedEntries(statusCounts).map(([status, count]) => (
          <div key={status} className='contents'>
            <h3 className='text-lg md:text-2xl'>{serviceStatuses[status] ?? 'Unknown'}</h3>
            <span className={`${statusClasses[status]} text-2xl`}>{count}</span>
          </div>
        ))}
      </Card>
      <HistoryCard serviceId={null} />
    </PageWrapper>
  );
}
