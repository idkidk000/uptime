'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Button } from '@/components/button';
import { PageWrapper } from '@/components/page-wrapper';
import { lowerToSentenceCase } from '@/lib/utils';

const sections: string[] = ['general', 'groups', 'notifiers'];

// hidden <Activity/> renders the component at a lower priority with display:none and hooks disabled
export default function SettingsLayout({ children }: { children: ReactNode }) {
  const pathName = usePathname();
  const section = pathName.split('/').at(-1);
  return (
    <PageWrapper pageTitle={`${lowerToSentenceCase(section ?? '')} settings`}>
      <div className='grid grid-cols-[auto_5fr] gap-4'>
        <div className='grid mb-auto gap-2'>
          {sections.map((item) => (
            <Button as={Link} key={item} href={`/settings/${item}`} variant={section === item ? 'up' : 'muted'}>
              {lowerToSentenceCase(item)}
            </Button>
          ))}
        </div>
        <div className='@container'>{children}</div>
      </div>
    </PageWrapper>
  );
}
