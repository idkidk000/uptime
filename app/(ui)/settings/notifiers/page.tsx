'use client';

import { Card } from '@/components/card';
import { useAppQueries } from '@/hooks/app-queries';

export default function GroupsSettingsPage() {
  const { notifiers } = useAppQueries();
  return (
    <Card className='grid gap-4 grid-cols-[auto_auto_auto]'>
      <div className='contents font-semibold'>
        <div>Name</div>
        <div>Kind</div>
        <div>Active</div>
      </div>
      {notifiers.map((notifier) => (
        <div key={notifier.id} className='contents'>
          <div>{notifier.name}</div>
          <div>{notifier.params.kind}</div>
          <div>{notifier.active ? 'Active' : 'Disabled'}</div>
        </div>
      ))}
    </Card>
  );
}
