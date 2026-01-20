import Link from 'next/link';
import { Button } from '@/components/button';

export function Nav() {
  return (
    <nav className='w-full flex justify-between bg-background-head p-4 items-center gap-2 shadow-md'>
      {/** biome-ignore lint/performance/noImgElement: no */}
      <img src='/blahaj.png' className='h-lh' alt='Logo' />
      <h1 className='text-2xl font-semibold me-auto' aria-description='A little shork is watching over ur servers'>
        Uptime Blahaj
      </h1>
      <Button as={Link} href='/'>
        Dashboard
      </Button>
    </nav>
  );
}
