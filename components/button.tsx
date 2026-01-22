import type { ComponentProps, ComponentPropsWithoutRef, ElementType, RefObject } from 'react';
import { cn } from '@/lib/utils';

const base = 'rounded-full shadow-md transition-colors border-2 inline-flex gap-1 items-center font-semibold';

const variants = {
  up: 'border-transparent bg-up hover:bg-up/75 active:bg-up/50 disabled:bg-up/25 disabled:text-foreground/75 text-background',
  pending:
    'border-transparent bg-pending hover:bg-pending/75 active:bg-pending/50 disabled:bg-pending/25 disabled:text-foreground/75 text-background',
  down: 'border-transparent bg-down hover:bg-down/75 active:bg-down/50 disabled:bg-down/25 disabled:text-foreground/75',
  paused:
    'border-transparent bg-paused hover:bg-paused/75 active:bg-paused/50 disabled:bg-paused/25 disabled:text-foreground/75 text-background',
  unknown:
    'border-transparent bg-unknown hover:bg-unknown/75 active:bg-unknown/50 disabled:bg-unknown/25 disabled:text-foreground/75 text-background',
  muted:
    'border-foreground/10 bg-background-card hover:bg-background-card/75 active:bg-background-card/50 disabled:bg-background-card/25 disabled:text-foreground/75',
  transparent: 'border-foreground/10',
} as const;

export type ButtonVariant = keyof typeof variants;

const sizes = {
  sm: 'px-2 text-sm *:[svg]:size-4',
  md: 'px-4 py-2 *:[svg]:size-4',
  lg: 'px-4 py-2 *:[svg]:size-6',
} as const;

export type ButtonSize = keyof typeof sizes;

export function Button<T extends ElementType = 'button'>({
  children,
  className,
  size = 'md',
  variant = 'up',
  as,
  ...props
}: ComponentPropsWithoutRef<T> & { size?: ButtonSize; variant?: ButtonVariant; as?: T; ref?: RefObject<T> }) {
  const Component = as ?? 'button';
  return (
    <Component className={cn(base, sizes[size], variants[variant], className)} {...props}>
      {children}
    </Component>
  );
}

export function ButtonGroup({ className, children, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        '*:not-first:border-s *:not-last:border-e *:rounded-none *:first:rounded-s-full *:last:rounded-e-full',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
