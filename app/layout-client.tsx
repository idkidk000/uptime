'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { Button } from '@/components/base/button';
import { Nav } from '@/components/nav';
import { ServiceList } from '@/components/service-list';
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
          <Nav />
          <main className='grid grid-cols-[2fr_5fr] p-4 gap-4'>
            <section className='flex flex-col gap-4'>
              <Button className='me-auto' as={Link} href='/add' size='lg'>
                <Plus />
                Add New Service
              </Button>
              <ServiceList />
            </section>
            {children}
          </main>
          <ReactQueryDevtools />
        </IntervalProvider>
      </AppQueriesProvider>
    </QueryClientProvider>
  );
}
