import type { ComponentProps } from 'react';
import { Badge, type BadgeVariant } from '@/components/badge';
import { ServiceState } from '@/lib/drizzle/schema';

const stateData: Record<ServiceState | 'fallback', { label: string; variant: BadgeVariant }> = {
  [ServiceState.Up]: { label: 'Up', variant: 'up' },
  [ServiceState.Down]: { label: 'Down', variant: 'down' },
  [ServiceState.Pending]: { label: 'Pending', variant: 'pending' },
  [ServiceState.Paused]: { label: 'Paused', variant: 'paused' },
  fallback: { label: 'Unknown', variant: 'unknown' },
};

export function StateBadge({
  state,
  children,
  ...props
}: Omit<ComponentProps<typeof Badge>, 'variant'> & { state: ServiceState | undefined }) {
  const { label, variant } = stateData[state ?? 'fallback'];
  return (
    <Badge variant={variant} {...props}>
      {children ?? label}
    </Badge>
  );
}
