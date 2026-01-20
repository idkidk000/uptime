import { and, desc, eq, getTableColumns, gte, isNull, lte, or } from 'drizzle-orm';
import { config } from '@/lib/config';
import { dateAdd, dateDiff } from '@/lib/date';
import { db } from '@/lib/drizzle';
import {
  type HistorySelect,
  historyTable,
  ServiceState,
  type ServiceWithState,
  type StateInsert,
  serviceTable,
  stateTable,
} from '@/lib/drizzle/schema';
import { Logger } from '@/lib/logger';
import { MessageClient } from '@/lib/messaging';
import { HttpMonitor } from '@/lib/monitor/http';
import { concurrently, mean, pick, roundTo } from '@/lib/utils';

const messageClient = new MessageClient(import.meta.url);
const logger = new Logger(import.meta.url);
let interval: NodeJS.Timeout | null = null;
const POLL_MILLIS = 60_000;
const STARTUP_DELAY_MILLIS = 5_000;

function calcUptime(history: Pick<HistorySelect, 'createdAt' | 'state'>[]): number {
  const stateTimes = history.reduce<Record<ServiceState, number>>(
    (acc, item, i, arr) => {
      const nextDate = i < arr.length - 1 ? arr[i + 1].createdAt : new Date();
      if (item.state === ServiceState.Paused) return acc;
      acc[item.state] += dateDiff(nextDate, item.createdAt);
      return acc;
    },
    {
      [ServiceState.Up]: 0,
      [ServiceState.Down]: 0,
      [ServiceState.Pending]: 0,
      [ServiceState.Paused]: 0,
    }
  );
  logger.debugLow('calcUptime', stateTimes);
  return (100 * stateTimes[ServiceState.Up]) / (Object.values(stateTimes).reduce((acc, item) => acc + item, 0) || 1);
}

async function checkService(service: ServiceWithState) {
  const monitor = service.params.kind === 'http' ? new HttpMonitor(service.params) : null;
  if (monitor === null) throw new Error(`unhandled monitor kind ${service.params.kind} with id ${service.id}`);
  const current = await monitor.check();
  const failures = current.ok ? 0 : (service.state?.failures ?? 0) + 1;
  const value = current.ok
    ? ServiceState.Up
    : failures >= service.failuresBeforeDown
      ? ServiceState.Down
      : ServiceState.Pending;

  // FIXME: increment nextCheckAt until it's in the future. prev + Math.ceil(datediff/checkSec)*checkSec
  const nextCheckAt = dateAdd({ seconds: service.checkSeconds }, service.state?.nextCheckAt || new Date());
  const [updated] = await db.transaction(async (tx) => {
    await tx.insert(historyTable).values({ serviceId: service.id, result: current, state: value });

    const historySummary = (
      await tx
        .select(pick(getTableColumns(historyTable), ['createdAt', 'state', 'result']))
        .from(historyTable)
        .where(eq(historyTable.serviceId, service.id))
        .orderBy(desc(historyTable.createdAt))
        .limit(config.historySummaryItems)
    ).map(({ result, ...rest }) => ({ ...rest, ...('latency' in result ? { latency: result.latency } : {}) }));

    const history1d = (
      await tx
        .select(pick(getTableColumns(historyTable), ['createdAt', 'state', 'result']))
        .from(historyTable)
        .where(and(eq(historyTable.serviceId, service.id), gte(historyTable.createdAt, dateAdd({ days: -1 }))))
    ).map(({ result, ...rest }) => ({ ...rest, ...('latency' in result ? { latency: result.latency } : {}) }));

    const history30d = await tx
      .select(pick(getTableColumns(historyTable), ['createdAt', 'state']))
      .from(historyTable)
      .where(and(eq(historyTable.serviceId, service.id), gte(historyTable.createdAt, dateAdd({ days: -30 }))));

    // uptime1d, uptime30d, latency1d

    const uptime1d = roundTo(calcUptime(history1d), 3);
    const uptime30d = roundTo(calcUptime(history30d), 3);
    const latency1d = roundTo(
      mean(history1d.map(({ latency }) => latency).filter((item) => typeof item === 'number')),
      3
    );

    const row: Omit<StateInsert, 'serviceId'> = {
      current,
      failures,
      historySummary,
      nextCheckAt,
      latency1d,
      uptime1d,
      uptime30d,
      value,
    };

    return await tx
      .insert(stateTable)
      .values({ ...row, serviceId: service.id })
      .onConflictDoUpdate({ target: stateTable.serviceId, set: row })
      .returning();
  });
  logger.debugLow({ service, current, updated });
  messageClient.send({ kind: 'invalidation', value: 'service-history', id: service.id });
  messageClient.send({ kind: 'invalidation', value: 'service-state', id: service.id });
}

export async function checkServices() {
  const services = await db
    .select({ ...getTableColumns(serviceTable), state: getTableColumns(stateTable) })
    .from(serviceTable)
    .leftJoin(stateTable, eq(stateTable.serviceId, serviceTable.id))
    .where(
      and(eq(serviceTable.active, true), or(lte(stateTable.nextCheckAt, new Date()), isNull(stateTable.serviceId)))
    );
  logger.debugLow(
    'checking services',
    services.map(({ id, name, state }) => ({ id, name, lastCheck: state?.updatedAt, nextCheck: state?.nextCheckAt }))
  );
  await concurrently(
    services.map((service) => () => checkService(service)),
    config.monitorConcurrency
  );
  logger.debugLow('services checked?');
}

export function start() {
  setTimeout(() => {
    void checkServices();
    interval = setInterval(checkServices, POLL_MILLIS);
  }, STARTUP_DELAY_MILLIS);

  messageClient.subscribe({ kind: 'action', value: 'test-service' }, ({ id }) => {
    db.select({ ...getTableColumns(serviceTable), state: getTableColumns(stateTable) })
      .from(serviceTable)
      .leftJoin(stateTable, eq(stateTable.serviceId, serviceTable.id))
      .where(eq(serviceTable.id, id))
      .then(([service]) => checkService(service));
  });
}

export function stop() {
  if (interval) clearInterval(interval);
}
