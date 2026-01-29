'use client';

import { redirect } from 'next/navigation';
import { PageWrapper } from '@/components/base/page-wrapper';
import { ServiceList } from '@/components/service-list';
import { useIsMobile } from '@/hooks/mobile';

export default function ListPage() {
  const { isMobile } = useIsMobile();

  // this page is a duplication of the sidebar visible on desktop
  if (!isMobile) return redirect('/dashboard');

  return (
    <PageWrapper pageTitle={null}>
      <ServiceList />
    </PageWrapper>
  );
}
