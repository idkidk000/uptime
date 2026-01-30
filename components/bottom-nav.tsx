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

// animation idea from https://youtube.com/watch?v=8_NQ7ARXz8c but firefox doesn't transition the span's anchor-relative position props (yet?)
export function BottomNav() {
  const pathName = usePathname();
  return (
    <nav className='md:hidden bg-background-head sticky bottom-0 transition-in-up mt-auto grid grid-cols-4 items-center gap-4'>
      {items.map(({ href, label, icon: Icon }) => (
        <Link
          href={href}
          key={href}
          className={cn(
            'flex flex-col items-center rounded-md py-2 transition-[-moz-background-color] duration-150 [-moz-background-color:var(--color-background-head)]',
            pathName.startsWith(href) &&
              '[anchor-name:--bottom-nav-anchor] [-moz-background-color:var(--color-background)]'
          )}
        >
          <Icon />
          {label}
        </Link>
      ))}
      <span
        className='fixed [position-anchor:--bottom-nav-anchor] left-[anchor(left)] right-[anchor(right)] top-[anchor(top)] bottom-[anchor(bottom)] transition-[left,right,top,bottom] duration-150 bg-background rounded-md -z-10 [-moz-background-color:var(--color-background-head)]'
        aria-hidden
      />
    </nav>
  );
}
