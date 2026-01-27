'use client';

import { TanStackDevtools } from '@tanstack/react-devtools';
import { formDevtoolsPlugin } from '@tanstack/react-form-devtools';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { Button } from '@/components/base/button';
import { BottomNav } from '@/components/bottom-nav';
import { ServiceList } from '@/components/service-list';
import { TopNav } from '@/components/top-nav';
import { AppQueriesProvider } from '@/hooks/app-queries';
import { IntervalProvider } from '@/hooks/interval';

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

export default function RootLayoutClient({
  children,
  ...queryData
}: { children: ReactNode } & ComponentProps<typeof AppQueriesProvider>) {
  return (
    <QueryClientProvider client={queryClient}>
      <AppQueriesProvider {...queryData}>
        <IntervalProvider>
          <TopNav />
          <main className='grid grid-cols-1 md:grid-cols-[2fr_5fr] p-4 md:gap-4 md:mt-4'>
            {/* FIXME: this probably should just not render at all on mobile */}
            <section className='hidden md:flex flex-col gap-4'>
              <Button className='me-auto' as={Link} href='/add' size='lg'>
                <Plus />
                Add New Service
              </Button>
              <ServiceList />
            </section>
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
