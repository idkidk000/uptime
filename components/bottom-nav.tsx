import { Gauge, List, Plus, Wrench } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ElementType } from 'react';
import { cn } from '@/lib/utils';

const items: { href: string; label: string; icon: ElementType }[] = [
  { href: '/dashboard', label: 'Home', icon: Gauge },
  { href: '/list', label: 'List', icon: List },
  { href: '/add', label: 'Add', icon: Plus },
  { href: '/settings', label: 'Settings', icon: Wrench },
];

// animation idea was from https://youtube.com/watch?v=S98uVU2CAl0 but it doesn't work in firefox yet
export function BottomNav() {
  const pathName = usePathname();
  return (
    <div className='block md:hidden bg-background-head sticky bottom-0 transition-in-up mt-auto'>
      <span className='fixed [position-anchor:--bottom-nav-anchor] left-[anchor(left)] right-[anchor(right)] top-[anchor(top)] bottom-[anchor(bottom)] transition-[left,right,top,bottom] duration-200 bg-background rounded-md -z-10' />
      <nav className='grid grid-cols-4 items-center gap-4'>
        {items.map(({ href, label, icon: Icon }) => (
          <Link
            href={href}
            key={href}
            className={cn(
              'flex flex-col items-center transition-[background-color,scale] duration-200 rounded-md py-2 origin-bottom',
              // href === pathName && 'bg-background shadow-md scale-110'
              href === pathName && '[anchor-name:--bottom-nav-anchor]'
            )}
          >
            <Icon />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
