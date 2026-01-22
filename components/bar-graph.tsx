/** biome-ignore-all lint/a11y/noSvgWithoutTitle: later */

import { useLayoutEffect, useRef, useState } from 'react';
import { RelativeDate } from '@/components/relative-date';
import { type MinifiedHistory, ServiceState } from '@/lib/drizzle/schema';
import { settings } from '@/lib/settings';
import { cn } from '@/lib/utils';

const stateClassNames: Record<ServiceState, string> = {
  [ServiceState.Up]: 'stroke-up fill-up/65',
  [ServiceState.Down]: 'stroke-down fill-down/65',
  [ServiceState.Pending]: 'stroke-pending fill-pending/65',
  [ServiceState.Paused]: 'stroke-paused fill-paused/65',
};

const viewboxWidth = 40 * settings.historySummaryItems;
const viewboxHeight = 100;
const radius = 10;

export function BarGraph({
  history,
  barWidth = 0.5,
  stokeWidth = 2,
  className,
  withLabels,
}: {
  history: MinifiedHistory | undefined;
  barWidth?: number;
  stokeWidth?: number;
  className?: string;
  withLabels?: boolean;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const [boundsHeight, setBoundsHeight] = useState(viewboxHeight);
  const maxLatency =
    history?.items
      ?.filter((item): item is Required<MinifiedHistory['items'][number]> => typeof item.latency === 'number')
      .reduce((acc, item) => Math.max(acc, item.latency), 0) ?? 0;
  const mappedStrokeWidth = (stokeWidth * viewboxHeight) / boundsHeight;
  const mostCommonState = (history?.items
    .reduce<number[]>((acc, item) => {
      acc[item.state] = (acc[item.state] ?? 0) + 1;
      return acc;
    }, [])
    .map((count, state) => ({ count, state }))
    .toSorted((a, b) => b.count - a.count)
    .at(0)?.state ?? ServiceState.Up) as ServiceState;

  // need to calculate stroke width from the client size
  //FIXME: test whether there's pop-in. the mapped stroke width is used in the viewBox ...but mapped stroke width is from a layout effect ...but it probably needs to render before boundingClientRect is correct
  useLayoutEffect(() => {
    if (!ref.current) return;
    function update() {
      if (!ref.current) return;
      setBoundsHeight(ref.current.getBoundingClientRect().height);
    }
    const observer = new ResizeObserver(update);
    observer.observe(ref.current);
    update();
    return () => observer.disconnect();
  }, []);

  return (
    <div className={cn('flex flex-col w-full', className)}>
      <svg
        viewBox={`${-mappedStrokeWidth} ${-mappedStrokeWidth} ${viewboxWidth + mappedStrokeWidth * 2} ${viewboxHeight + mappedStrokeWidth * 2}`}
        preserveAspectRatio='xMidYMid meet'
        strokeWidth={mappedStrokeWidth}
        ref={ref}
        className={stateClassNames[mostCommonState]}
      >
        {history?.items.map((item, i) => (
          <rect
            key={item.id}
            width={Math.round((viewboxWidth / settings.historySummaryItems) * barWidth)}
            height={Math.round(
              typeof item.latency === 'undefined' ? viewboxHeight : (viewboxHeight / maxLatency) * item.latency
            )}
            x={Math.round((viewboxWidth / settings.historySummaryItems) * i)}
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
