import type { ComponentProps, ComponentPropsWithoutRef, ElementType, RefObject } from 'react';

const base = 'rounded-full shadow-md transition-colors border-';

const variants = {
  up: 'border-transparent bg-up hover:bg-up/75 active:bg-up/50',
  pending: 'border-transparent bg-pending hover:bg-pending/75 active:bg-pending/50',
  down: 'border-transparent bg-down hover:bg-down/75 active:bg-down/50',
  paused: 'border-transparent bg-paused hover:bg-paused/75 active:bg-paused/50',
  unknown: 'border-transparent bg-unknown hover:bg-unknown/75 active:bg-unknown/50',
  transparent: 'border-foreground/10',
  muted: 'border-foreground/10 bg-background-card hover:bg-background-card/75 active:bg-background-card/50',
} as const;

export type ButtonVariant = keyof typeof variants;

const sizes = {
  sm: 'px-2 text-sm',
  md: 'px-4 py-2',
  lg: 'px-6 py-3',
};

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
    <Component className={`${base} ${sizes[size]} ${variants[variant]} ${className ?? ''}`} {...props}>
      {children}
    </Component>
  );
}

export function ButtonGroup({ className, children, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={`*:rounded-none *:first:rounded-s-full *:last:rounded-e-full *:border-s-0 *:first:border-s-2 ${className ?? ''}`}
      {...props}
    >
      {children}
    </div>
  );
}
