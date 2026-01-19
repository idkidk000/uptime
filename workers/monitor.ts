import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { historyTable, type MonitorSelect, MonitorState, monitorTable } from '@/lib/db/schema';
import { Logger } from '@/lib/logger';
import { MessageClient } from '@/lib/messaging';
import { HttpMonitor } from '@/lib/monitor/http';

const messageClient = new MessageClient(import.meta.url);
const logger = new Logger(import.meta.url);
let interval: NodeJS.Timeout | null = null;
const POLL_MILLIS = 60_000;
const STARTUP_DELAY_MILLIS = 5_000;

async function checkMonitor(monitorEntry: MonitorSelect) {
  const monitor = monitorEntry.params.kind === 'http' ? new HttpMonitor(monitorEntry.params) : null;
  if (monitor === null)
    throw new Error(`unhandled monitor kind ${monitorEntry.params.kind} with id ${monitorEntry.id}`);
  const checkedAt = new Date();
  const result = await monitor.check();
  const [updatedEntry] = await db.transaction(async (tx) => {
    const successiveFailures = result.ok ? 0 : monitorEntry.successiveFailures + 1;
    const state = result.ok
      ? MonitorState.Up
      : successiveFailures >= monitorEntry.failuresBeforeDown
        ? MonitorState.Down
        : MonitorState.Pending;
    await tx.insert(historyTable).values({ monitorId: monitorEntry.id, result, state });
    await tx
      .update(monitorTable)
      .set({
        successiveFailures,
        checkedAt,
      })
      .where(eq(monitorTable.id, monitorEntry.id));
    return await tx.select().from(monitorTable).where(eq(monitorTable.id, monitorEntry.id));
  });
  logger.debugLow({ monitorEntry, result, updatedEntry });
  messageClient.send({ kind: 'invalidation', value: 'monitor', id: monitorEntry.id });
  messageClient.send({ kind: 'invalidation', value: 'group', id: monitorEntry.groupId });
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
  await Promise.all(monitorEntries.map(checkMonitor));
}

export function start() {
  setTimeout(() => {
    void checkMonitors();
    interval = setInterval(checkMonitors, POLL_MILLIS);
  }, STARTUP_DELAY_MILLIS);
  messageClient.subscribe({ kind: 'action', value: 'run-monitor' }, (message) => {
    db.select()
      .from(monitorTable)
      .where(eq(monitorTable.id, message.id))
      .then(([monitorEntry]) => checkMonitor(monitorEntry));
  });
}

export function stop() {
  if (interval) clearInterval(interval);
}
