import type { ComponentProps } from 'react';
import { Badge, type BadgeVariant } from '@/components/badge';
import { ServiceStatus } from '@/lib/drizzle/schema';

const statusData: Record<ServiceStatus | 'fallback', { label: string; variant: BadgeVariant }> = {
  [ServiceStatus.Up]: { label: 'Up', variant: 'up' },
  [ServiceStatus.Down]: { label: 'Down', variant: 'down' },
  [ServiceStatus.Pending]: { label: 'Pending', variant: 'pending' },
  [ServiceStatus.Paused]: { label: 'Paused', variant: 'paused' },
  fallback: { label: 'Unknown', variant: 'unknown' },
};

export function StatusBadge({
  status,
  children,
  ...props
}: Omit<ComponentProps<typeof Badge>, 'variant'> & { status: ServiceStatus | undefined }) {
  const { label, variant } = statusData[status ?? 'fallback'];
  return (
    <Badge variant={variant} {...props}>
      {children ?? label}
    </Badge>
  );
}
