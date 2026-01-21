'use client';

import { Card } from '@/components/card';
import { HistoryCard } from '@/components/history-card';
import { useStateCounts } from '@/hooks/app-queries';
import { serviceStates } from '@/lib/drizzle/schema';
import { typedEntries } from '@/lib/utils';

export default function Home() {
  const counts = useStateCounts();

  return (
    <section className='flex flex-col gap-4'>
      <h1 className='p-1 text-2xl font-semibold'>Quick Stats</h1>
      <Card className='flex flex-row *:grow *:shrink *:basis-0 text-center'>
        {counts &&
          typedEntries(counts).map(([state, count]) => (
            <div key={state} className='flex flex-col gap-2'>
              <h3 className='text-2xl'>{serviceStates[state] ?? 'Unknown'}</h3>
              <span className='text-3xl font-bold'>{count}</span>
            </div>
          ))}
      </Card>
      <HistoryCard serviceId={null} />
    </section>
  );
}
