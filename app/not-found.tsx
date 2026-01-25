'use client';

import { permanentRedirect } from 'next/navigation';
import { useEffect } from 'react';
import { PageWrapper } from '@/components/base/page-wrapper';

const DELAY_MILLIS = 3_000;

export default function NotFoundPage() {
  useEffect(() => {
    const timeout = setTimeout(() => permanentRedirect('/dashboard'), DELAY_MILLIS);
    return () => clearTimeout(timeout);
  }, []);

  return <PageWrapper pageTitle="Wow there's nothing" />;
}
