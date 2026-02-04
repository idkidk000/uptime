import { Geist, Geist_Mono } from 'next/font/google';
import '@/app/(ui)/globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { getGroups } from '@/actions/group';
import { getNotifiers } from '@/actions/notifier';
import { getServices } from '@/actions/service';
import { getSettings } from '@/actions/setting';
import { getServiceStates, getStatusCounts } from '@/actions/state';
import { getTags } from '@/actions/tag';
import RootLayoutClient from '@/app/layout-client';
import { IsMobileProvider } from '@/hooks/mobile';
import { SseProvider } from '@/hooks/sse';
import { ToastProvider } from '@/hooks/toast';
import { description, displayName } from '@/package.json';

// next will otherwise compile in the queries inside the RootLayout function
export const dynamic = 'force-dynamic';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: displayName,
  description,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const groupsResponse = await getGroups();
  const servicesResponse = await getServices();
  const statesResponse = await getServiceStates();
  const stateCountsResponse = await getStatusCounts();
  const settingsResponse = await getSettings();
  const notifiersResponse = await getNotifiers();
  const tagsResponse = await getTags();
  return (
    <html lang='en'>
      <head>
        {/* <IconUpdater /> updates this dynamically */}
        <link rel='icon' href='/api/icon/default' />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex flex-col bg-background text-foreground transition-colors duration-150 accent-up antialiased min-h-dvh`}
      >
        {groupsResponse.ok &&
        servicesResponse.ok &&
        statesResponse.ok &&
        stateCountsResponse.ok &&
        settingsResponse.ok &&
        notifiersResponse.ok &&
        tagsResponse.ok ? (
          <IsMobileProvider>
            <SseProvider>
              <ToastProvider>
                <RootLayoutClient
                  groups={groupsResponse.data}
                  services={servicesResponse.data}
                  states={statesResponse.data}
                  statusCounts={stateCountsResponse.data}
                  settings={settingsResponse.data}
                  notifiers={notifiersResponse.data}
                  tags={tagsResponse.data}
                >
                  {children}
                </RootLayoutClient>
              </ToastProvider>
            </SseProvider>
          </IsMobileProvider>
        ) : (
          <div className='flex flex-col gap-4'>
            <h1 className='text-2xl font-semibold text-down'>Error retreiving data</h1>
            {[
              groupsResponse,
              servicesResponse,
              statesResponse,
              stateCountsResponse,
              settingsResponse,
              notifiersResponse,
              tagsResponse,
            ]
              .filter((item) => !item.ok)
              .map((item, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: shut
                <pre key={i}>{`${item.error}`}</pre>
              ))}
          </div>
        )}
      </body>
    </html>
  );
}
