'use client';

import { Card } from '@/components/base/card';
import { PageWrapper } from '@/components/base/page-wrapper';
import { HistoryCard } from '@/components/history-card';
import { useAppQueries } from '@/hooks/app-queries';
import { ServiceStatus, serviceStatuses } from '@/lib/drizzle/schema';
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
      <Card className='flex flex-row *:grow *:shrink *:basis-0 text-center'>
        {typedEntries(statusCounts).map(([status, count]) => (
          <div key={status} className='flex flex-col gap-2 font-bold'>
            <h3 className='text-lg md:text-2xl'>{serviceStatuses[status] ?? 'Unknown'}</h3>
            <span className={`${statusClasses[status]} text-2xl`}>{count}</span>
          </div>
        ))}
      </Card>
      <HistoryCard serviceId={null} />
    </PageWrapper>
  );
}
