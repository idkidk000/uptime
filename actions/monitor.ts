/** biome-ignore-all lint/suspicious/useAwait: server actions must be async */
'use server';

import { getTableColumns, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { type HistorySelect, historyTable, type MonitorSelect, monitorTable } from '@/lib/db/schema';
import { MessageClient } from '@/lib/messaging';
import { pick } from '@/lib/utils';

const messageClient = new MessageClient(import.meta.url);

export type MinifiedHistory = Pick<HistorySelect, 'createdAt' | 'state'> & { latency?: number };

export type FrontendMonitor = MonitorSelect & {
  latest: Pick<HistorySelect, 'createdAt' | 'result' | 'state'> | null;
  history: MinifiedHistory[];
};

export async function getMonitors(): Promise<FrontendMonitor[]> {
  // FIXME: think about how to do this efficiently
  // trying to join monitors and subquery through drizzle looks like it duplicates monitors for each joined row of subquery
  const monitors = await db.select().from(monitorTable);
  const subquery = db
    .select({
      ...getTableColumns(historyTable),
      rowNo: sql<number>`row_number() over (partition by monitorId order by createdAt desc)`.as('rowNo'),
    })
    .from(historyTable)
    .as('subquery');
  const history = await db.select().from(subquery).where(sql`rowNo <= 24`);
  const result: FrontendMonitor[] = new Array(monitors.length);
  for (const [m, monitor] of monitors.entries()) {
    const monitorHistory = history.filter((item) => item.monitorId === monitor.id);
    const [latestFull] = monitorHistory;
    const latest = latestFull ? pick(latestFull, ['createdAt', 'result', 'state']) : null;
    const minifiedHistory = monitorHistory.map(({ createdAt, state, result }) => ({
      createdAt,
      state,
      ...('latency' in result ? { latency: result.latency } : {}),
    }));
    result[m] = { ...monitor, latest, history: minifiedHistory };
  }

  return result;
}

export async function checkMonitor(id: number) {
  messageClient.send({ kind: 'action', value: 'run-monitor', id });
}
