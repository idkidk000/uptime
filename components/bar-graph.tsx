import { type SVGProps, useLayoutEffect, useRef, useState } from 'react';
import { RelativeDate } from '@/components/relative-date';
import { config } from '@/lib/config';
import { type MinifiedHistory, ServiceState } from '@/lib/drizzle/schema';

const defaultBounds = { width: 100, height: 10 };

const stateClassNames: Record<ServiceState, string> = {
  [ServiceState.Up]: 'stroke-up fill-up/65',
  [ServiceState.Down]: 'stroke-down fill-down/65',
  [ServiceState.Pending]: 'stroke-pending fill-pending/65',
  [ServiceState.Paused]: 'stroke-paused fill-paused/65',
};

// FIXME: this has pop-in because it has to dynamically resize the svg. try to factor it out
// FIXME: assign most common state classes to top level and override invididual rects
export function BarGraph({
  className,
  history,
  role = 'img',
  strokeWidth = 2,
  showLabels,
  radius = 0.01,
  barWidth = 0.5,
  ...props
}: {
  history: MinifiedHistory | undefined;
  showLabels?: boolean;
  radius?: number;
  barWidth?: number;
} & Omit<SVGProps<SVGSVGElement>, 'width' | 'height' | 'viewBox'>) {
  const [bounds, setBounds] = useState({ ...defaultBounds });
  const ref = useRef<SVGSVGElement>(null);

  const numStrokeWidth = Number(strokeWidth);
  const innerWidth = bounds.width - numStrokeWidth * 2;
  const innerHeight = bounds.height - numStrokeWidth * 2;
  const cellWidth = innerWidth / config.historySummaryItems;
  const cellInnerWidth = cellWidth * barWidth;
  const maxLatency =
    history?.items
      ?.filter((item): item is Required<MinifiedHistory['items'][number]> => typeof item.latency === 'number')
      .reduce((acc, item) => Math.max(acc, item.latency), 0) ?? 0;

  useLayoutEffect(() => {
    if (!ref.current) return;
    function update() {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      setBounds({ width: rect.width, height: rect.height });
    }
    const observer = new ResizeObserver(update);
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={`flex flex-col ${className ?? 'w-full'}`}>
      <svg
        viewBox={`0 0 ${Math.round(bounds.width)} ${Math.round(bounds.height)}`}
        role={role}
        strokeWidth={strokeWidth}
        ref={ref}
        {...props}
      >
        {history?.items.map((item, i) => (
          <rect
            key={item.id}
            x={Math.round(
              cellWidth * (config.historySummaryItems - history.items.length + i) +
                numStrokeWidth +
                (cellWidth - cellInnerWidth) * 0.5
            )}
            width={Math.round(cellInnerWidth)}
            y={Math.round(
              innerHeight -
                (typeof item.latency === 'number' ? (item.latency / maxLatency) * innerHeight : innerHeight) +
                numStrokeWidth
            )}
            height={Math.round(
              typeof item.latency === 'number' ? (item.latency / maxLatency) * innerHeight : innerHeight
            )}
            rx={Math.round(innerWidth * radius)}
            className={stateClassNames[item.state]}
          ></rect>
        ))}
      </svg>
      {showLabels && history && (
        <div className='flex justify-between'>
          <RelativeDate date={history.from} />
          <RelativeDate date={history.to} />
        </div>
      )}
    </div>
  );
}
