import { Gauge } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/button';

export function Nav() {
  return (
    <nav className='w-full flex justify-between bg-background-head p-4 items-center gap-2 shadow-md'>
      {/** biome-ignore lint/performance/noImgElement: no */}
      <img src='/blahaj.png' className='h-lh' alt='A little shork is watching over ur servers' />
      <h1 className='text-2xl font-semibold me-auto'>Uptime Blahaj</h1>
      <Button as={Link} href='/'>
        <Gauge />
        Dashboard
      </Button>
    </nav>
  );
}
