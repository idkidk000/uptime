import { sql } from 'drizzle-orm';
import { db } from '@/lib/drizzle';
import { Logger } from '@/lib/logger';

const logger = new Logger(import.meta.url);

const [{ avg }] = (await db.all(sql`
      select
        coalesce(sum(latency), 0) / iif(count(1) > 0, count(1), 1) as avg
      from (
        select json_extract(result, '$.latency') as latency
        from history
        where
          serviceId = 1
        and createdAt >= unixepoch('now', '-1 day')
        and latency is not null
      )
    `)) as [{ avg: number }];
logger.plain(avg);
