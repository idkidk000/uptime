import { Geist, Geist_Mono } from 'next/font/google';
import '@/app/globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { getGroups } from '@/actions/group';
import { getServices } from '@/actions/service';
import { getServiceStates, getStateCounts } from '@/actions/state';
import RootLayoutClient from '@/app/layout-client';
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

const groups = await getGroups();
const services = await getServices();
const states = await getServiceStates();
const stateCounts = await getStateCounts();

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang='en'>
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex flex-col gap-4 bg-background text-foreground transition-colors duration-200 accent-up antialiased`}
      >
        <RootLayoutClient groups={groups} services={services} states={states} stateCounts={stateCounts}>
          {children}
        </RootLayoutClient>
      </body>
    </html>
  );
}
