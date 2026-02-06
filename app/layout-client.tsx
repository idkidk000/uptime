'use client';

import { TanStackDevtools } from '@tanstack/react-devtools';
import { formDevtoolsPlugin } from '@tanstack/react-form-devtools';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, type ComponentProps, type ReactNode } from 'react';
import { BottomNav } from '@/components/bottom-nav';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { IconUpdater } from '@/components/icon-updater';
import { ServiceList } from '@/components/service-list';
import { TopNav } from '@/components/top-nav';
import { AppQueriesProvider } from '@/hooks/app-queries';
import { IntervalProvider } from '@/hooks/interval';
import { useIsMobile } from '@/hooks/mobile';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // don't mark stale after some timeout
      staleTime: Infinity,
      // these options are actually refetch on x **if stale** (i.e. they were inactive then were invalidated via sse)
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      refetchOnReconnect: 'always',
    },
  },
});

// the same <ServiceList/> is used for desktop sidebar and mobile /list page. <Activity/> preserves state while hidden
export default function RootLayoutClient({
  children,
  ...queryData
}: { children: ReactNode } & ComponentProps<typeof AppQueriesProvider>) {
  const { isMobile } = useIsMobile();
  const pathName = usePathname();
  return (
    <QueryClientProvider client={queryClient}>
      <AppQueriesProvider {...queryData}>
        <IntervalProvider>
          <TopNav />
          <main className='grid grid-cols-1 md:grid-cols-[minmax(0,26rem)_1fr] p-4 md:gap-4 md:mt-4'>
            <Activity mode={isMobile && pathName !== '/list' ? 'hidden' : 'visible'}>
              <article className='flex flex-col gap-4 @container/sidebar'>
                <Card variant='ghost' className='shrink-0 max-md:hidden'>
                  <Button className='me-auto' as={Link} href='/add' size='lg'>
                    <Plus />
                    Add New Service
                  </Button>
                </Card>
                <ServiceList />
              </article>
            </Activity>
            {children}
          </main>
          <BottomNav />
          <IconUpdater />
          <ReactQueryDevtools />
          <TanStackDevtools plugins={[formDevtoolsPlugin()]} config={{ position: 'middle-right' }} />
        </IntervalProvider>
      </AppQueriesProvider>
    </QueryClientProvider>
  );
}
