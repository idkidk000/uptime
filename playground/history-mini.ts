import { desc, eq, getTableColumns, sql } from 'drizzle-orm';
import { config } from '@/lib/config';
import { db } from '@/lib/drizzle';
import { historyTable } from '@/lib/drizzle/schema';
import { Logger } from '@/lib/logger';
import { pick } from '@/lib/utils';

const logger = new Logger(import.meta.url);

const serviceId = 1;

const result = (
  await db
    .select({
      ...pick(getTableColumns(historyTable), ['id', 'createdAt', 'state']),
      latency: sql<number | null>`json_extract(result, '$.latency')`,
    })
    .from(historyTable)
    .where(eq(historyTable.serviceId, serviceId))
    .orderBy(desc(historyTable.createdAt))
    .limit(config.historySummaryItems)
).toReversed();

logger.plain(result);
