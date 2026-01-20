import type { ComponentProps } from 'react';

export function Card({ className, children, ...props }: ComponentProps<'article'>) {
  return (
    <article className={`rounded-xl bg-background-card shadow-xl p-4 ${className}`} {...props}>
      {children}
    </article>
  );
}
