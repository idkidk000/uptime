'use client';

import { PageWrapper } from '@/components/base/page-wrapper';
import { SettingsForm } from '@/forms/settings';

export default function SettingsPage() {
  return (
    <PageWrapper pageTitle='Settings'>
      <SettingsForm />
    </PageWrapper>
  );
}
