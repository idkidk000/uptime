import { LoaderCircle } from 'lucide-react';
import { PageWrapper } from '@/components/page-wrapper';

export function LoadingPage() {
  return (
    <PageWrapper pageTitle='Loading'>
      <LoaderCircle className='animate-spin size-24' />
    </PageWrapper>
  );
}
