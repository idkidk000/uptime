import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

const base = 'rounded-full shadow transition-colors border-2 font-semibold';

const variants = {
  up: 'border-transparent bg-up hover:bg-up/75 active:bg-up/50 text-dark',
  pending: 'border-transparent bg-pending hover:bg-pending/75 active:bg-pending/50 text-dark',
  down: 'border-transparent bg-down hover:bg-down/75 active:bg-down/50 text-light',
  paused: 'border-transparent bg-paused hover:bg-paused/75 active:bg-paused/50 text-dark',
  unknown: 'border-transparent bg-unknown hover:bg-unknown/75 active:bg-unknown/50 text-dark',
  transparent: 'border-foreground/10',
  muted: 'border-foreground/10 bg-background-card hover:bg-background-card/75 active:bg-background-card/50',
} as const;

export type BadgeVariant = keyof typeof variants;

const sizes = {
  sm: 'px-2 text-sm',
  md: 'px-4 py-2',
  lg: 'px-6 py-3',
} as const;

export type BadgeSize = keyof typeof sizes;

export function Badge({
  children,
  className,
  size = 'md',
  variant = 'up',
  ...props
}: ComponentProps<'span'> & { size?: BadgeSize; variant?: BadgeVariant }) {
  return (
    <span className={cn(base, sizes[size], variants[variant], className)} {...props}>
      {children}
    </span>
  );
}
