'use client';

import { useParams } from 'next/navigation';
import { PageWrapper } from '@/components/page-wrapper';
import { ServiceForm } from '@/forms/service';

export default function ClonePage() {
  const { id } = useParams();
  return (
    <PageWrapper pageTitle='Clone service'>
      <ServiceForm mode='clone' id={Number(id)} />
    </PageWrapper>
  );
}
