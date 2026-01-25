import { Gauge, Wrench } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/base/button';
import { description, displayName } from '@/package.json';

export function Nav() {
  return (
    <nav className='w-full flex justify-between bg-background-head p-4 items-center gap-2 shadow-md'>
      <img src='/mascot.png' className='h-lh' alt={description} />
      <h1 className='text-2xl font-semibold me-auto'>{displayName}</h1>
      <Button as={Link} href='/' size='lg'>
        <Gauge />
        Dashboard
      </Button>
      <Button as={Link} href='/settings' variant='muted' className='py-1 border-transparent'>
        <Wrench className='bg-up rounded-full p-1 size-8! text-dark' />
      </Button>
    </nav>
  );
}
