'use client';

import { Card } from '@/components/card';
import { useAppQueries } from '@/hooks/app-queries';

export default function GroupsSettingsPage() {
  const { groups } = useAppQueries();
  return (
    <Card className='grid gap-4 grid-cols-[auto_auto]'>
      <div className='contents font-semibold'>
        <div>Name</div>
        <div>Active</div>
      </div>
      {groups.map((group) => (
        <div key={group.id} className='contents'>
          <div>{group.name}</div>
          <div>{group.active ? 'Active' : 'Disabled'}</div>
        </div>
      ))}
    </Card>
  );
}
