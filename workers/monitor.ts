import type { ResultSet } from '@libsql/client';
import { desc, eq, getTableColumns, isNull, lte, or, sql, type TableRelationalConfig } from 'drizzle-orm';
import type { SQLiteTransaction } from 'drizzle-orm/sqlite-core';
import { dateAdd, dateDiff } from '@/lib/date';
import { db } from '@/lib/drizzle';
import {
  historyTable,
  type MinifiedHistory,
  ServiceState,
  type ServiceWithState,
  type StateInsert,
  serviceTable,
  stateTable,
} from '@/lib/drizzle/schema';
import { Logger } from '@/lib/logger';
import { MessageClient } from '@/lib/messaging';
import type { BaseMonitorParams, Monitor, MonitorResponse } from '@/lib/monitor';
import { HttpMonitor } from '@/lib/monitor/http';
import { settings } from '@/lib/settings';
import { concurrently, pick, roundTo } from '@/lib/utils';

const messageClient = new MessageClient(import.meta.url);
const logger = new Logger(import.meta.url);
let interval: NodeJS.Timeout | null = null;
const POLL_MILLIS = 60_000;
const STARTUP_DELAY_MILLIS = 5_000;

// i'm sure this generic definitely won't break on every drizzle update
async function getUptime(
  tx: SQLiteTransaction<'async', ResultSet, Record<string, unknown>, Record<string, TableRelationalConfig>>,
  serviceId: number,
  days: number
): Promise<number> {
  // parametrisation breaks `unixepoch('now', '${-days} day')`
  const daysParam = `-${days} day`;
  const raw: { state: ServiceState; seconds: number }[] = await tx.all(
    sql`
    select
      state,
      sum(nextCreatedAt - createdAt) as seconds
      from (
        select
          createdAt,
          state,
          coalesce(lead(createdAt) over win, unixepoch()) as nextCreatedAt
        from history
        where
          serviceId = ${serviceId}
          and createdAt >= unixepoch('now', ${daysParam})
        window win as (
          partition by serviceId
          order by createdAt
        )
      )
      group by state`
  );
  return (
    (100 * (raw.find((item) => item.state === ServiceState.Up)?.seconds ?? 0)) /
    (raw.filter((item) => item.state !== ServiceState.Paused).reduce((acc, item) => acc + item.seconds, 0) || 1)
  );
}

function getMonitor(service: ServiceWithState): Monitor<BaseMonitorParams, MonitorResponse> {
  const monitor = service.params.kind === 'http' ? new HttpMonitor(service.params) : null;
  if (monitor === null) throw new Error(`unhandled monitor kind ${service.params.kind} with id ${service.id}`);
  return monitor;
}

async function checkService(service: ServiceWithState): Promise<void> {
  // logger.debugLow('checkService', service);
  const current = service.active ? await getMonitor(service).check() : null;
  const failures = current?.ok ? 0 : (service.state?.failures ?? 0) + (current === null ? 0 : 1);
  const value =
    current === null
      ? ServiceState.Paused
      : current.ok
        ? ServiceState.Up
        : failures >= service.failuresBeforeDown
          ? ServiceState.Down
          : ServiceState.Pending;

  const nextCheckAt = service.state?.nextCheckAt
    ? dateAdd(
        {
          millis: Math.floor(dateDiff(service.state.nextCheckAt) / (service.checkSeconds * 1000)),
          seconds: service.checkSeconds,
        },
        service.state.nextCheckAt
      )
    : dateAdd({ seconds: service.checkSeconds });
  logger.debugLow('nextCheckAt', { prev: service.state?.nextCheckAt, sec: service.checkSeconds, next: nextCheckAt });
  const [updated] = await db.transaction(async (tx) => {
    await tx.insert(historyTable).values({ serviceId: service.id, result: current, state: value });

    const miniHistoryRaw = (
      await tx
        .select({
          ...pick(getTableColumns(historyTable), ['id', 'createdAt', 'state']),
          latency: sql<number | null>`json_extract(result, '$.latency')`,
        })
        .from(historyTable)
        .where(eq(historyTable.serviceId, service.id))
        .orderBy(desc(historyTable.createdAt))
        .limit(settings.historySummaryItems)
    ).toReversed();

    const miniHistory: MinifiedHistory = {
      from: miniHistoryRaw[0].createdAt,
      to: miniHistoryRaw[miniHistoryRaw.length - 1].createdAt,
      items: miniHistoryRaw.map(({ createdAt: _createdAt, latency, ...rest }) => ({
        ...rest,
        ...(typeof latency === 'number' ? { latency } : {}),
      })),
    };

    const uptime1d = await getUptime(tx, service.id, 1);
    const uptime30d = await getUptime(tx, service.id, 30);
    const [{ latency1d }] = (await tx.all(sql`
      select
        coalesce(sum(latency), 0) / iif(count(1) > 0, count(1), 1) as latency1d
      from (
        select json_extract(result, '$.latency') as latency
        from history
        where
          serviceId = ${service.id}
        and createdAt >= unixepoch('now', '-1 day')
        and latency is not null
      )
    `)) as [{ latency1d: number }];

    logger.info('id', service.id, { uptime1d, uptime30d, latency1d });

    const row: Omit<StateInsert, 'id'> = {
      current,
      failures,
      miniHistory,
      nextCheckAt,
      latency1d: roundTo(latency1d, 3),
      uptime1d: roundTo(uptime1d, 3),
      uptime30d: roundTo(uptime30d, 3),
      value,
    };

    return await tx
      .insert(stateTable)
      .values({ ...row, id: service.id })
      .onConflictDoUpdate({ target: stateTable.id, set: row })
      .returning();
  });
  // logger.debugMed({ service, current, updated });
  messageClient.send({ cat: 'invalidation', kind: 'service-state', id: service.id });
  // only invalidate history on MonitorState, MonitorResult.kind, MonitorDownResult.reason change
  if (
    updated.value !== service.state?.value ||
    updated.current?.kind !== service.state.current?.kind ||
    (updated.current && 'reason' in updated.current && updated.current.reason) !==
      (service.state.current && 'reason' in service.state.current && service.state.current.reason)
  )
    messageClient.send({ cat: 'invalidation', kind: 'service-history', id: service.id });
}

export async function checkServices() {
  const services = await db
    .select({ ...getTableColumns(serviceTable), state: getTableColumns(stateTable) })
    .from(serviceTable)
    .leftJoin(stateTable, eq(stateTable.id, serviceTable.id))
    .where(or(lte(stateTable.nextCheckAt, new Date()), isNull(stateTable.id)));
  logger.debugLow(
    'checking services',
    services.map(({ id, name, state }) => ({ id, name, lastCheck: state?.updatedAt, nextCheck: state?.nextCheckAt }))
  );
  await concurrently(services, checkService, settings.monitorConcurrency);
}

function checkServiceById(id: number): void {
  db.select({ ...getTableColumns(serviceTable), state: getTableColumns(stateTable) })
    .from(serviceTable)
    .leftJoin(stateTable, eq(stateTable.id, serviceTable.id))
    .where(eq(serviceTable.id, id))
    .then(([service]) => checkService(service));
}

export function start(): void {
  setTimeout(() => {
    void checkServices();
    interval = setInterval(checkServices, POLL_MILLIS);
  }, STARTUP_DELAY_MILLIS);

  messageClient.subscribe({ cat: 'action', kind: 'test-service' }, ({ id }) => checkServiceById(id));
}

export function stop(): void {
  if (interval) clearInterval(interval);
}
