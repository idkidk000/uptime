import Link from 'next/link';
import { BarGraph } from '@/components/bar-graph';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { StateBadge } from '@/components/state-badge';
import { useServicesWithState } from '@/hooks/app-queries';

export function ServiceList() {
  const services = useServicesWithState();

  return (
    <Card className='px-0 py-0 flex flex-col  overflow-hidden'>
      <h3 className='bg-background-head p-4 flex flex-col gap-2'>
        <div className='flex justify-between'>
          <Button variant='muted'>Select</Button>
          <Button variant='muted'>Search</Button>
        </div>
        <div className='flex gap-2'>
          <Button variant='muted'>Status</Button>
          <Button variant='muted'>Active</Button>
          <Button variant='muted'>Tags</Button>
        </div>
      </h3>
      <ul className='flex flex-col p-4 overflow-y-auto gap-4'>
        {services.map((service) => (
          <li key={service.id}>
            <Link href={`/${service.id}`} className='flex gap-2 items-center'>
              <StateBadge
                size='sm'
                state={service.state?.value}
                className='shrink-0'
              >{`${service.state?.uptime1d ?? '-'} %`}</StateBadge>
              <h4 className='shrink-0 me-auto'>{service.name}</h4>
              <BarGraph history={service.state?.historySummary} />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
