import { RelativeDate } from '@/components/relative-date';
import { useAppQueries } from '@/hooks/app-queries';
import { toLocalIso } from '@/lib/date';
import { type MiniHistory, ServiceStatus } from '@/lib/drizzle/schema';
import { cn } from '@/lib/utils';

const statusClassNames: Record<ServiceStatus, string> = {
  [ServiceStatus.Up]: 'fill-up',
  [ServiceStatus.Down]: 'fill-down',
  [ServiceStatus.Pending]: 'fill-pending',
  [ServiceStatus.Paused]: 'fill-paused',
};

const viewboxHeight = 100;
const radius = 10;
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
  const viewboxWidth = itemViewboxWidth * settings.historySummaryItems;
  const maxLatency =
    history?.items
      ?.filter((item): item is Required<MiniHistory['items'][number]> => typeof item.latency === 'number')
      .reduce((acc, item) => Math.max(acc, item.latency), 0) ?? 0;
  const mostCommonStatus = (history?.items
    .reduce<number[]>((acc, item) => {
      acc[item.status] = (acc[item.status] ?? 0) + 1;
      return acc;
    }, [])
    .map((count, status) => ({ count, status }))
    .toSorted((a, b) => b.count - a.count)
    .at(0)?.status ?? ServiceStatus.Up) as ServiceStatus;

  return (
    <div className={cn('flex flex-col w-full', className)}>
      <svg
        viewBox={`0 0 ${viewboxWidth} ${viewboxHeight}`}
        preserveAspectRatio='xMidYMid meet'
        className={statusClassNames[mostCommonStatus]}
      >
        <title>{`History graph${history ? ` from ${toLocalIso(history.from, { endAt: 's' })} to ${toLocalIso(history.to, { endAt: 's' })}` : ''}`}</title>
        {history?.items.map((item, i) => (
          <rect
            key={item.id}
            width={Math.round((viewboxWidth / settings.historySummaryItems) * barWidth)}
            height={Math.round(
              typeof item.latency === 'undefined' ? viewboxHeight : (viewboxHeight / maxLatency) * item.latency
            )}
            x={Math.round(
              (viewboxWidth / settings.historySummaryItems) * (settings.historySummaryItems - history.items.length + i)
            )}
            y={Math.round(
              typeof item.latency === 'undefined' ? 0 : viewboxHeight - (viewboxHeight / maxLatency) * item.latency
            )}
            rx={radius}
            className={item.status === mostCommonStatus ? undefined : statusClassNames[item.status]}
            suppressHydrationWarning
          />
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
