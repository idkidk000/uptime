'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Button, ButtonGroup } from '@/components/button';
import { PageWrapper } from '@/components/page-wrapper';
import { lowerToSentenceCase } from '@/lib/utils';

const sections: string[] = ['general', 'groups', 'notifiers', 'tags', 'data'];

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const pathName = usePathname();
  const section = pathName.split('/').at(-1);
  return (
    <PageWrapper pageTitle={`${lowerToSentenceCase(section ?? '')} settings`}>
      <ButtonGroup>
        {sections.map((item) => (
          <Button as={Link} key={item} href={`/settings/${item}`} variant={section === item ? 'up' : 'muted'}>
            {lowerToSentenceCase(item)}
          </Button>
        ))}
      </ButtonGroup>
      {children}
    </PageWrapper>
  );
}
