import { useMemo } from 'react';
import { RelativeDate } from '@/components/relative-date';
import { useAppQueries } from '@/hooks/app-queries';
import { toLocalIso } from '@/lib/date';
import type { MiniHistory } from '@/lib/drizzle/zod/schema';
import { ServiceStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

const statusClassNames: Record<ServiceStatus, string> = {
  [ServiceStatus.Up]: 'stroke-up',
  [ServiceStatus.Down]: 'stroke-down',
  [ServiceStatus.Pending]: 'stroke-pending',
  [ServiceStatus.Paused]: 'stroke-paused',
};

const viewboxHeight = 100;
const itemViewboxWidth = 40;

export function BarGraph({
  history,
  barWidth = 0.5,
  className,
  withLabels,
}: {
  history: MiniHistory | undefined;
  barWidth?: number;
  className?: string;
  withLabels?: boolean;
}) {
  const { settings } = useAppQueries();
  const viewboxWidth = itemViewboxWidth * settings.history.summaryItems;
  const strokeWidth = (viewboxWidth / settings.history.summaryItems) * barWidth;

  const statusPaths = useMemo(() => {
    const maxLatency =
      history?.items
        ?.filter((item): item is Required<MiniHistory['items'][number]> => typeof item.latency === 'number')
        .reduce((acc, item) => Math.max(acc, item.latency), 0) ?? 0;

    const itemGeoms =
      history?.items.map(({ status, latency }, i) => ({
        status,
        x: (viewboxWidth / settings.history.summaryItems) * (i + 0.5),
        height:
          typeof latency === 'undefined'
            ? viewboxHeight - strokeWidth
            : (Math.ceil((10 * latency) / maxLatency) / 10) * (viewboxHeight - strokeWidth),
      })) ?? [];

    return [...new Set(itemGeoms?.map((item) => item.status))].map((status) => ({
      status,
      path: itemGeoms
        .filter((item) => item.status === status)
        .map(({ x, height }) => `M${x},${viewboxHeight - strokeWidth / 2} v${-height}`)
        .join(' '),
    }));
  }, [history?.items, settings.history.summaryItems, strokeWidth, viewboxWidth]);

  return (
    <div className={cn('flex flex-col w-full justify-center', className)}>
      <svg
        viewBox={`0 0 ${viewboxWidth} ${viewboxHeight}`}
        preserveAspectRatio='xMidYMid meet'
        strokeLinecap='round'
        strokeWidth={strokeWidth}
      >
        <title
          suppressHydrationWarning
        >{`History graph${history ? ` from ${toLocalIso(history.from, { endAt: 's' })} to ${toLocalIso(history.to, { endAt: 's' })}` : ''}`}</title>
        {statusPaths?.map(({ status, path }) => (
          <path key={status} className={statusClassNames[status]} d={path} />
        ))}
      </svg>
      {withLabels && history && (
        <div className='flex justify-between'>
          <RelativeDate date={history.from} />
          <RelativeDate date={history.to} />
        </div>
      )}
    </div>
  );
}
