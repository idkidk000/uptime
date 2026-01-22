import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, children, ...props }: ComponentProps<'article'>) {
  return (
    <article className={cn('rounded-xl bg-background-card shadow-xl p-4', className)} {...props}>
      {children}
    </article>
  );
}
