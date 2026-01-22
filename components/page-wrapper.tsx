'use client';

import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export function PageWrapper({
  className,
  children,
  pageTitle,
  ...props
}: ComponentProps<'div'> & { pageTitle: string }) {
  return (
    <section className={cn('flex flex-col gap-4 overflow-x-hidden overflow-y-auto h-full', className)} {...props}>
      <h1 className='text-3xl font-semibold p-1'>{pageTitle}</h1>
      {children}
    </section>
  );
}
