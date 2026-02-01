import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export function Card({
  className,
  children,
  variant = 'standard',
  ...props
}: ComponentProps<'article'> & { variant?: 'standard' | 'ghost' }) {
  return (
    <section
      className={cn(
        variant === 'standard' && 'rounded-xl bg-background-card shadow-xl p-4 transition-in-up',
        variant === 'ghost' && 'transition-in-left',
        className
      )}
      {...props}
    >
      {children}
    </section>
  );
}
