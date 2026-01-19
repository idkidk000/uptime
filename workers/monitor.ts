import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { historyTable, monitorTable } from '@/lib/db/schema';
import { Logger } from '@/lib/logger';
import { MessageClient } from '@/lib/messaging';
import { HttpMonitor } from '@/lib/monitor/http';

const messageClient = new MessageClient(import.meta.url);
const logger = new Logger(import.meta.url);
let interval: NodeJS.Timeout | null = null;

function checkMonitorById(id: number) {
  logger.debugLow('TODO: check monitor by id', id);
}

export async function checkMonitors() {
  const monitorEntries = await db
    .select()
    .from(monitorTable)
    .where(
      and(
        eq(monitorTable.active, true),
        sql`coalesce(${monitorTable.checkedAt}, 0) + ${monitorTable.checkSeconds} < unixepoch()`
      )
    );
  for (const monitorEntry of monitorEntries) {
    const monitor = monitorEntry.params.kind === 'http' ? new HttpMonitor(monitorEntry.params) : null;
    if (monitor === null)
      throw new Error(`unhandled monitor kind ${monitorEntry.params.kind} with id ${monitorEntry.id}`);
    const checkedAt = new Date();
    const result = await monitor.check();
    const [updatedEntry] = await db.transaction(async (tx) => {
      await tx.insert(historyTable).values({ monitorId: monitorEntry.id, result });
      await tx
        .update(monitorTable)
        .set({
          successiveFailures: result.ok ? 0 : monitorEntry.successiveFailures + 1,
          checkedAt,
        })
        .where(eq(monitorTable.id, monitorEntry.id));
      return await tx.select().from(monitorTable).where(eq(monitorTable.id, monitorEntry.id));
    });
    logger.debugLow({ monitorEntry, result, updatedEntry });
    messageClient.send({ kind: 'invalidation', value: 'monitor', id: monitorEntry.id });
    messageClient.send({ kind: 'invalidation', value: 'group', id: monitorEntry.groupId });
  }
}

export function start() {
  interval = setInterval(checkMonitors, 5_000);
  messageClient.subscribe({ kind: 'action', value: 'run-monitor' }, (message) => {
    if (message.kind !== 'action') return;
    if (message.value !== 'run-monitor') return;
    checkMonitorById(message.id);
  });
}

export function stop() {
  if (interval) clearInterval(interval);
}
