'use client';

import { Card } from '@/components/card';
import { HistoryCard } from '@/components/history-card';
import { PageWrapper } from '@/components/page-wrapper';
import { useAppQueries } from '@/hooks/app-queries';
import { ServiceState, serviceStates } from '@/lib/drizzle/schema';
import { typedEntries } from '@/lib/utils';

const stateClasses: Record<ServiceState | -1, string> = {
  [ServiceState.Up]: 'text-up',
  [ServiceState.Down]: 'text-down',
  [ServiceState.Pending]: 'text-pending',
  [ServiceState.Paused]: 'text-paused',
  [-1]: 'text-unknown',
};

export default function Home() {
  const { stateCounts } = useAppQueries();

  return (
    <PageWrapper pageTitle='Quick Stats'>
      <Card className='flex flex-row *:grow *:shrink *:basis-0 text-center'>
        {typedEntries(stateCounts).map(([state, count]) => (
          <div key={state} className='flex flex-col gap-2 text-2xl font-bold'>
            <h3>{serviceStates[state] ?? 'Unknown'}</h3>
            <span className={stateClasses[state]}>{count}</span>
          </div>
        ))}
      </Card>
      <HistoryCard serviceId={null} />
    </PageWrapper>
  );
}
