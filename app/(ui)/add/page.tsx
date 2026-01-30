'use client';

import { PageWrapper } from '@/components/page-wrapper';
import { ServiceForm } from '@/forms/service';

export default function AddPage() {
  return (
    <PageWrapper pageTitle='Add a new service'>
      <ServiceForm mode='add' />
    </PageWrapper>
  );
}
