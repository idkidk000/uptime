'use client';

import { TanStackDevtools } from '@tanstack/react-devtools';
import { formDevtoolsPlugin } from '@tanstack/react-form-devtools';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { Activity, type ComponentProps, type ReactNode } from 'react';
import { BottomNav } from '@/components/bottom-nav';
import { Button } from '@/components/button';
import { ServiceList } from '@/components/service-list';
import { TopNav } from '@/components/top-nav';
import { AppQueriesProvider } from '@/hooks/app-queries';
import { IntervalProvider } from '@/hooks/interval';
import { useIsMobile } from '@/hooks/mobile';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});

// hidden <Activity/> renders the component at a lower priority with display:none and hooks disabled
export default function RootLayoutClient({
  children,
  ...queryData
}: { children: ReactNode } & ComponentProps<typeof AppQueriesProvider>) {
  const { isMobile } = useIsMobile();
  return (
    <QueryClientProvider client={queryClient}>
      <AppQueriesProvider {...queryData}>
        <IntervalProvider>
          <TopNav />
          <main className='grid grid-cols-1 md:grid-cols-[minmax(0,26rem)_1fr] p-4 md:gap-4 md:mt-4'>
            <Activity mode={isMobile ? 'hidden' : 'visible'}>
              <section className='flex flex-col gap-4'>
                <Button className='me-auto' as={Link} href='/add' size='lg'>
                  <Plus />
                  Add New Service
                </Button>
                <ServiceList />
              </section>
            </Activity>
            {children}
          </main>
          <BottomNav />
          <ReactQueryDevtools />
          <TanStackDevtools plugins={[formDevtoolsPlugin()]} config={{ position: 'middle-right' }} />
        </IntervalProvider>
      </AppQueriesProvider>
    </QueryClientProvider>
  );
}
