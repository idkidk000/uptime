import { eq, getTableColumns, sql } from 'drizzle-orm';
import { toLocalIso } from '@/lib/date';
import { db } from '@/lib/drizzle';
import { historyTable, keyValTable, serviceTable } from '@/lib/drizzle/schema';
import { ServerLogger } from '@/lib/logger/server';
import { MessageClient } from '@/lib/messaging';
import { pick } from '@/lib/utils';

const DB_KEY = 'db.maintenance' as const;

const messageClient = await MessageClient.newAsync(import.meta.url);
const logger = new ServerLogger(messageClient);

let lastMaintenance: number | null = null;
let timeout: NodeJS.Timeout | null = null;

function schedule() {
  const nextScheduledAt = lastMaintenance
    ? lastMaintenance + messageClient.settings.database.maintenanceFrequency
    : Date.now();
  if (timeout) clearTimeout(timeout);
  logger.info('scheduling for', toLocalIso(nextScheduledAt, { endAt: 's' }));
  timeout = setTimeout(() => doMaintenance(nextScheduledAt), Math.max(0, nextScheduledAt - Date.now()));
}

async function doMaintenance(scheduledAt: number) {
  const services = await db
    .select(pick(getTableColumns(serviceTable), ['id', 'retainCount', 'name']))
    .from(serviceTable);
  let totalRows = 0;
  for (const service of services) {
    const { rowsAffected } = await db.delete(historyTable).where(
      sql`${historyTable.id} in (
        select ${historyTable.id} from (
          select
            ${historyTable.id},
            row_number() over (order by ${historyTable.createdAt} desc) as rowNo
          from ${historyTable}
          where ${historyTable.serviceId} = ${service.id}
        )
        where rowNo >= ${service.retainCount}
      )`
    );
    logger.debugLow('deleted', rowsAffected, 'expired history rows for', service.name);
    totalRows += rowsAffected;
  }
  // requires `PRAGMA auto_vacuum=INCREMENTAL;`
  // https://sqlite.org/pragma.html#pragma_incremental_vacuum
  db.run(sql`PRAGMA incremental_vacuum;`);
  db.insert(keyValTable)
    .values({ key: DB_KEY, value: scheduledAt })
    .onConflictDoUpdate({
      target: keyValTable.key,
      set: {
        value: scheduledAt,
      },
    });
  logger.info('deleted', totalRows, 'expired history rows and vacuumed database');
  lastMaintenance = scheduledAt;
  schedule();
}

export async function start(): Promise<void> {
  const rows = await db
    .select(pick(getTableColumns(keyValTable), ['value']))
    .from(keyValTable)
    .where(eq(keyValTable.key, DB_KEY));
  lastMaintenance = rows.length ? (rows[0].value as number) : null;
  if (lastMaintenance === null) {
    // drizzle migrations mishandle the SQLITE_OK return value from calling pragmas
    // auto_vacuum=INCREMENTAL requires a full vacuum to take effect if run after tables have been created
    await db.run(sql`
      PRAGMA journal_mode=WAL;
      PRAGMA auto_vacuum=INCREMENTAL;
      VACUUM;
    `);
  }
  schedule();
  messageClient.subscribe({ cat: 'settings', kind: 'update' }, schedule);
}

export function stop(): void {
  if (timeout) clearTimeout(timeout);
}
