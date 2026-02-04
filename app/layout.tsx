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
  const groups = await getGroups();
  const services = await getServices();
  const states = await getServiceStates();
  const stateCounts = await getStatusCounts();
  const settings = await getSettings();
  const notifiers = await getNotifiers();
  const tags = await getTags();
  return (
    <html lang='en'>
      <head>
        {/* <IconUpdater /> updates this dynamically */}
        <link rel='icon' href='/api/icon/default' />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex flex-col bg-background text-foreground transition-colors duration-150 accent-up antialiased min-h-dvh`}
      >
        <IsMobileProvider>
          <SseProvider>
            <ToastProvider>
              <RootLayoutClient
                groups={groups}
                services={services}
                states={states}
                statusCounts={stateCounts}
                settings={settings}
                notifiers={notifiers}
                tags={tags}
              >
                {children}
              </RootLayoutClient>
            </ToastProvider>
          </SseProvider>
        </IsMobileProvider>
      </body>
    </html>
  );
}
