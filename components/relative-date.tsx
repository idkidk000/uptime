import type { ComponentPropsWithoutRef, ElementType, RefObject } from 'react';
import { useInterval } from '@/hooks/interval';
import { toRelative } from '@/lib/date';

export function RelativeDate<T extends ElementType = 'span'>({
  date,
  as,
  ...props
}: Omit<ComponentPropsWithoutRef<T>, 'children'> & {
  date: Parameters<typeof toRelative>[0];
  as?: T;
  ref?: RefObject<T>;
}) {
  // re-render on each interval tick
  const { now } = useInterval();
  const Component = as ?? 'span';
  const value = toRelative(date);
  // now is used as a key to maybe stop react compiler from optimising it out
  return (
    <Component {...props} key={now.getTime()} suppressHydrationWarning>
      {value}
    </Component>
  );
}
