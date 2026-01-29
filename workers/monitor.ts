import { eq, getTableColumns, isNull, lte, or } from 'drizzle-orm';
import { dateAdd, dateDiff } from '@/lib/date';
import { db } from '@/lib/drizzle';
import {
  getLatencySql,
  getMiniHistory,
  getUptimeSql,
  type LatencySelect,
  type UptimeSelect,
} from '@/lib/drizzle/queries';
import {
  historyTable,
  ServiceStatus,
  type ServiceWithState,
  type StateInsert,
  serviceTable,
  stateTable,
} from '@/lib/drizzle/schema';
import { ServerLogger } from '@/lib/logger/server';
import { MessageClient } from '@/lib/messaging';
import type { Monitor } from '@/lib/monitor';
import { getMonitor } from '@/lib/monitor/utils';
import { SettingsClient } from '@/lib/settings';
import { concurrently } from '@/lib/utils';

const messageClient = new MessageClient(import.meta.url);
const settingsClient = await SettingsClient.newAsync(import.meta.url, messageClient);
const logger = new ServerLogger(import.meta.url);
let interval: NodeJS.Timeout | null = null;
const POLL_MILLIS = 60_000;
const STARTUP_DELAY_MILLIS = 5_000;

const cache = new Map<number, { updatedAt: Date; monitor: Monitor }>();

function getInstance(service: ServiceWithState): Monitor | null {
  if (!service.active) return null;
  const cached = cache.get(service.id);
  if (cached && cached.updatedAt === service.updatedAt) return cached.monitor;
  const monitor = getMonitor(service.params, settingsClient);
  cache.set(service.id, { updatedAt: service.updatedAt, monitor });
  return monitor;
}

async function checkService(service: ServiceWithState): Promise<void> {
  const instance = getInstance(service);
  const current = instance ? await instance.check() : null;
  const failures = current?.ok ? 0 : (service.state?.failures ?? 0) + (current === null ? 0 : 1);
  const status =
    current === null
      ? ServiceStatus.Paused
      : current.ok
        ? ServiceStatus.Up
        : failures >= service.failuresBeforeDown
          ? ServiceStatus.Down
          : ServiceStatus.Pending;

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
  const isStateChange = status !== service.state?.status;
  const [updated] = await db.transaction(async (tx) => {
    await tx.insert(historyTable).values({ serviceId: service.id, result: current, status });

    const miniHistory = await getMiniHistory(service.id, settingsClient.current.history.summaryItems, tx);
    const { uptime1d, uptime30d }: UptimeSelect = await tx.get(getUptimeSql(service.id));
    const { latency1d }: LatencySelect = await tx.get(getLatencySql(service.id));

    const row: Omit<StateInsert, 'id'> = {
      current,
      failures,
      miniHistory,
      nextCheckAt,
      latency1d,
      uptime1d,
      uptime30d,
      status,
      ...(isStateChange ? { changedAt: new Date() } : {}),
    };

    return await tx
      .insert(stateTable)
      .values({ ...row, id: service.id })
      .onConflictDoUpdate({ target: stateTable.id, set: row })
      .returning();
  });
  messageClient.send({ cat: 'invalidation', kind: 'service-state', id: service.id });
  // more aggressive than isStateChange because we show history summary rows for each change of state, kind, and reason
  if (
    isStateChange ||
    updated.current?.kind !== service.state?.current?.kind ||
    (updated.current && 'reason' in updated.current && updated.current.reason) !==
      (service.state?.current && 'reason' in service.state.current && service.state.current.reason)
  )
    messageClient.send(
      { cat: 'invalidation', kind: 'service-history', id: service.id },
      // FIXME: this is redundant. sse route can just send toasts to clients from service-history invalidations
      {
        cat: 'toast',
        kind: 'status',
        id: service.id,
        status: updated.status,
        message: updated.current?.message ?? 'Monitor is paused',
        name: service.name,
      }
    );
  if (isStateChange)
    messageClient.send({
      cat: 'status',
      kind: updated.status,
      id: service.id,
      name: service.name,
      // FIXME: kind of jank
      message: updated.current?.message ?? 'Monitor is paused',
      ...(updated.current && 'reason' in updated.current ? { reason: updated.current.reason } : {}),
    });
}

export async function checkServices() {
  if (!settingsClient.current.monitor.enable) return;
  const services = await db
    .select({ ...getTableColumns(serviceTable), state: getTableColumns(stateTable) })
    .from(serviceTable)
    .leftJoin(stateTable, eq(stateTable.id, serviceTable.id))
    .where(or(lte(stateTable.nextCheckAt, new Date()), isNull(stateTable.id)));
  logger.debugLow(
    'checking services',
    services.map(({ id, name, state }) => ({ id, name, lastCheck: state?.updatedAt, nextCheck: state?.nextCheckAt }))
  );
  await concurrently(services, checkService, settingsClient.current.monitor.concurrency);
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

  messageClient.subscribe({ cat: 'action', kind: 'check-service' }, ({ id }) => checkServiceById(id));
}

export function stop(): void {
  if (interval) clearInterval(interval);
}
