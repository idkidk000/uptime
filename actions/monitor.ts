'use server';

import { desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { type HistorySelect, historyTable, type MonitorSelect, monitorTable } from '@/lib/db/schema';

export type MonitorWithHistorySelect = MonitorSelect & {
  history: Pick<HistorySelect, 'createdAt' | 'result'>[];
};

// TODO: only really need full detail for latest history item. prev can be date and state
export async function getMonitors(): Promise<MonitorWithHistorySelect[]> {
  // FIXME: optimise. i don't know the drizzle syntax to put a joined subquery into an array
  const monitors = await db.select().from(monitorTable);
  const result: MonitorWithHistorySelect[] = new Array(monitors.length);
  for (const [m, monitor] of monitors.entries()) {
    const history = await db
      .select({ result: historyTable.result, createdAt: historyTable.createdAt })
      .from(historyTable)
      .where(eq(historyTable.monitorId, monitor.id))
      .orderBy(desc(historyTable.createdAt))
      .limit(10);
    result[m] = { ...monitor, history };
  }
  return result;
  // const subquery = db
  //   .select({
  //     monitorId: historyTable.monitorId,
  //     createdAt: historyTable.createdAt,
  //     result: historyTable.result,
  //     rowNo: sql<number>`row_number() over (partitiion by monitorId order by createdAt desc)`,
  //   })
  //   .from(historyTable)
  //   .having(sql`rowNo <= 10`)
  //   .as('subquery');
  // const result = await db
  //   .select({
  //     ...getTableColumns(monitorTable),
  //     history: {
  //       createdAt: subquery.createdAt,
  //       result: subquery.result,
  //     },
  //   })
  //   .from(monitorTable)
  //   .leftJoin(subquery, eq(monitorTable.id, subquery.monitorId));
  // return result;
}
