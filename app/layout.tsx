import { Geist, Geist_Mono } from 'next/font/google';
import '@/app/globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { getGroups } from '@/actions/group';
import { getServices } from '@/actions/service';
import { getSettings } from '@/actions/setting';
import { getServiceStates, getStateCounts } from '@/actions/state';
import RootLayoutClient from '@/app/layout-client';
import { SseProvider } from '@/hooks/sse';
import { ToastProvider } from '@/hooks/toast';
import { description, displayName } from '@/package.json';

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
  const stateCounts = await getStateCounts();
  const settings = await getSettings();
  return (
    <html lang='en'>
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex flex-col gap-4 bg-background text-foreground transition-colors duration-200 accent-up antialiased`}
      >
        <SseProvider>
          <ToastProvider>
            <RootLayoutClient
              groups={groups}
              services={services}
              states={states}
              stateCounts={stateCounts}
              settings={settings}
            >
              {children}
            </RootLayoutClient>
          </ToastProvider>
        </SseProvider>
      </body>
    </html>
  );
}
