import type { SVGProps } from 'react';
import type { HistorySelect } from '@/lib/db/schema';

export function MonitorGraph({
  history,
  className,
  ...props
}: {
  history: Pick<HistorySelect, 'createdAt' | 'result'>[];
} & SVGProps<SVGSVGElement>) {
  const width = 100;
  const height = 20;
  const cellWidth = width / history.length;
  const maxLatency = history
    .map(({ result }) => result)
    .filter((result) => result.ok === true)
    .map((result) => result.latencyMs)
    .reduce((acc, item) => Math.max(acc, item), 0);
  return (
    <svg className={className} viewBox={`0 0 ${width} ${height}`} role='graphics-symbol' strokeWidth={1} {...props}>
      {history.map((item, i) => (
        <rect
          key={item.createdAt.valueOf()}
          x={cellWidth * i}
          y={height - (item.result.ok ? (item.result.latencyMs / maxLatency) * height : height)}
          width={cellWidth}
          height={item.result.ok ? (item.result.latencyMs / maxLatency) * height : height}
          rx={2}
          stroke='currentColor'
          className={item.result.ok ? 'stroke-green-500 fill-green-500/25' : 'stroke-red-500 fill-red-500/25'}
        ></rect>
      ))}
    </svg>
  );
}
