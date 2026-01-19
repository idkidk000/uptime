import { type SVGProps, useLayoutEffect, useRef, useState } from 'react';
import type { MinifiedHistory } from '@/actions/monitor';
import { toRelative } from '@/lib/date';
import { MonitorState } from '@/lib/db/schema';

const defaultBounds = { width: 100, height: 10 };

const stateClassNames: Record<MonitorState, string> = {
  [MonitorState.Up]: 'stroke-green-500 fill-green-500/75',
  [MonitorState.Down]: 'stroke-red-500 fill-red-500/75',
  [MonitorState.Pending]: 'stroke-orange-500 fill-orange-500/75',
};

export function MonitorGraph({
  className,
  history,
  role = 'graphics-symbol',
  strokeWidth = 1,
  showLabels,
  ...props
}: {
  history: MinifiedHistory[];
  showLabels?: boolean;
} & Omit<SVGProps<SVGSVGElement>, 'width' | 'height' | 'viewBox'>) {
  const [bounds, setBounds] = useState({ ...defaultBounds });
  const ref = useRef<SVGSVGElement>(null);

  const numStrokeWidth = Number(strokeWidth);
  const innerWidth = bounds.width - numStrokeWidth * 2;
  const innerHeight = bounds.height - numStrokeWidth * 2;
  const cellWidth = innerWidth / history.length;
  const cellInnerWidth = cellWidth * 0.7;
  const maxLatency = history
    .filter((item): item is Required<MinifiedHistory> => typeof item.latency === 'number')
    .reduce((acc, item) => Math.max(acc, item.latency), 0);

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
    <div className={`flex flex-col ${className}`}>
      <svg viewBox={`0 0 ${bounds.width} ${bounds.height}`} role={role} strokeWidth={strokeWidth} ref={ref} {...props}>
        {history.toReversed().map((item, i) => (
          <rect
            key={item.createdAt.valueOf()}
            x={cellWidth * i + numStrokeWidth + (cellWidth - cellInnerWidth) * 0.5}
            width={cellInnerWidth}
            y={
              innerHeight -
              (typeof item.latency === 'number' ? (item.latency / maxLatency) * innerHeight : innerHeight) +
              numStrokeWidth
            }
            height={typeof item.latency === 'number' ? (item.latency / maxLatency) * innerHeight : innerHeight}
            rx={innerWidth * 0.01}
            stroke='currentColor'
            className={stateClassNames[item.state]}
          ></rect>
        ))}
      </svg>
      {showLabels && (
        <div className='flex justify-between'>
          <span>{toRelative(history.at(-1)?.createdAt)}</span>
          <span>{toRelative(history.at(0)?.createdAt)}</span>
        </div>
      )}
    </div>
  );
}
