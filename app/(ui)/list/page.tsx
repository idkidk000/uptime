'use client';

import { PageWrapper } from '@/components/base/page-wrapper';
import { ServiceList } from '@/components/service-list';

export default function AddPage() {
  return (
    <PageWrapper pageTitle={null}>
      <ServiceList />
    </PageWrapper>
  );
}
