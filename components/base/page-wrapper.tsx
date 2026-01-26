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
    <article
      className={cn('flex flex-col gap-4 overflow-x-hidden overflow-y-auto h-full @container', className)}
      {...props}
    >
      <h1 className='text-3xl font-semibold p-1 transition-in-right'>{pageTitle}</h1>
      {children}
    </article>
  );
}
