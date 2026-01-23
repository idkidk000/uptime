/** biome-ignore-all lint/a11y/noSvgWithoutTitle: later */

import { RelativeDate } from '@/components/relative-date';
import { type MinifiedHistory, ServiceState } from '@/lib/drizzle/schema';
import { settings } from '@/lib/settings';
import { cn } from '@/lib/utils';

const stateClassNames: Record<ServiceState, string> = {
  [ServiceState.Up]: 'fill-up',
  [ServiceState.Down]: 'fill-down',
  [ServiceState.Pending]: 'fill-pending',
  [ServiceState.Paused]: 'fill-paused',
};

const viewboxWidth = 40 * settings.historySummaryItems;
const viewboxHeight = 100;
const radius = 10;

export function BarGraph({
  history,
  barWidth = 0.5,
  className,
  withLabels,
}: {
  history: MinifiedHistory | undefined;
  barWidth?: number;
  stokeWidth?: number;
  className?: string;
  withLabels?: boolean;
}) {
  const maxLatency =
    history?.items
      ?.filter((item): item is Required<MinifiedHistory['items'][number]> => typeof item.latency === 'number')
      .reduce((acc, item) => Math.max(acc, item.latency), 0) ?? 0;
  const mostCommonState = (history?.items
    .reduce<number[]>((acc, item) => {
      acc[item.state] = (acc[item.state] ?? 0) + 1;
      return acc;
    }, [])
    .map((count, state) => ({ count, state }))
    .toSorted((a, b) => b.count - a.count)
    .at(0)?.state ?? ServiceState.Up) as ServiceState;

  return (
    <div className={cn('flex flex-col w-full', className)}>
      <svg
        viewBox={`0 0 ${viewboxWidth} ${viewboxHeight}`}
        preserveAspectRatio='xMidYMid meet'
        className={stateClassNames[mostCommonState]}
      >
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
            className={item.state === mostCommonState ? undefined : stateClassNames[item.state]}
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
