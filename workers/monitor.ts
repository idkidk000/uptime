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
  ServiceState,
  type ServiceWithState,
  type StateInsert,
  serviceTable,
  stateTable,
} from '@/lib/drizzle/schema';
import { ServerLogger } from '@/lib/logger/server';
import { MessageClient } from '@/lib/messaging';
import type { BaseMonitorParams, Monitor, MonitorResponse } from '@/lib/monitor';
import { DnsMonitor } from '@/lib/monitor/dns';
import { DomainMonitor } from '@/lib/monitor/domain';
import { HttpMonitor } from '@/lib/monitor/http';
import { PingMonitor } from '@/lib/monitor/ping';
import { SslMonitor } from '@/lib/monitor/ssl';
import { TcpMonitor } from '@/lib/monitor/tcp';
import { SettingsClient } from '@/lib/settings';
import { concurrently } from '@/lib/utils';

const messageClient = new MessageClient(import.meta.url);
const settingsClient = new SettingsClient(import.meta.url, await SettingsClient.getSettings(), messageClient);
const logger = new ServerLogger(import.meta.url);
let interval: NodeJS.Timeout | null = null;
const POLL_MILLIS = 60_000;
const STARTUP_DELAY_MILLIS = 5_000;

function getMonitor(service: ServiceWithState): Monitor<BaseMonitorParams, MonitorResponse> {
  switch (service.params.kind) {
    case 'http':
      return new HttpMonitor(service.params, settingsClient);
    case 'dns':
      return new DnsMonitor(service.params, settingsClient);
    case 'ping':
      return new PingMonitor(service.params, settingsClient);
    case 'ssl':
      return new SslMonitor(service.params, settingsClient);
    case 'tcp':
      return new TcpMonitor(service.params, settingsClient);
    case 'domain':
      return new DomainMonitor(service.params, settingsClient);
    default:
      throw new Error(`unhandled monitor kind ${(service.params as { kind: string }).kind} with id ${service.id}`);
  }
}

async function checkService(service: ServiceWithState): Promise<void> {
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
  const isStateChange = value !== service.state?.value;
  const [updated] = await db.transaction(async (tx) => {
    await tx.insert(historyTable).values({ serviceId: service.id, result: current, state: value });

    const miniHistory = await getMiniHistory(service.id, settingsClient.current.historySummaryItems, tx);
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
      value,
      ...(isStateChange ? { changedAt: new Date() } : {}),
    };

    return await tx
      .insert(stateTable)
      .values({ ...row, id: service.id })
      .onConflictDoUpdate({ target: stateTable.id, set: row })
      .returning();
  });
  messageClient.send({ cat: 'invalidation', kind: 'service-state', id: service.id });
  // more aggressive than isStateChange becuase we show history summary rows for each change of state, kind, and reason
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
        kind: 'state',
        id: service.id,
        state: updated.value,
        message: updated.current?.message ?? 'Monitor is paused',
        name: service.name,
      }
    );
  if (isStateChange)
    messageClient.send({
      cat: 'state',
      kind: updated.value,
      id: service.id,
      name: service.name,
      // FIXME: kind of jank
      message: updated.current?.message ?? 'Monitor is paused',
      ...(updated.current && 'reason' in updated.current ? { reason: updated.current.reason } : {}),
    });
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
  await concurrently(services, checkService, settingsClient.current.monitorConcurrency);
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
