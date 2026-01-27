import { Gauge, Wrench } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/base/button';
import { description, displayName } from '@/package.json';

export function TopNav() {
  return (
    <nav className='flex justify-center bg-background-head p-4 items-center gap-2 shadow-md top-0 sticky z-10'>
      <img src='/mascot.png' className='h-lh' alt={description} />
      <h1 className='text-2xl font-semibold'>{displayName}</h1>
      <Button as={Link} href='/' size='lg' className='ms-auto hidden md:inline-flex'>
        <Gauge />
        Dashboard
      </Button>
      <Button as={Link} href='/settings' variant='muted' className='py-1 border-transparent hidden md:flex'>
        <Wrench className='bg-up rounded-full p-1 size-8! text-dark' />
      </Button>
    </nav>
  );
}
