'use client';

import { useParams } from 'next/navigation';
import { PageWrapper } from '@/components/page-wrapper';
import { ServiceForm } from '@/forms/service';

export default function EditPage() {
  const { id } = useParams();
  return (
    <PageWrapper pageTitle='Edit service'>
      <ServiceForm mode='edit' id={Number(id)} />
    </PageWrapper>
  );
}
