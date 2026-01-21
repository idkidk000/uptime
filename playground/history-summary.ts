import { sql } from 'drizzle-orm';
import { db } from '@/lib/drizzle';
import type { HistorySelect } from '@/lib/drizzle/schema';
import { Logger } from '@/lib/logger';

const logger = new Logger(import.meta.url);

const pageSize = 5;
const pageNum = 0;
const serviceId: number | undefined = undefined;

const result = (
  (await db.all(sql`
    select
      serviceId,
      result,
      state,
      createdAt
    from (
      select
        *,
        lag(state) over win as prevState,
        lag(result) over win as prevResult
      from history
      ${typeof serviceId === 'number' ? sql`where serviceId = ${serviceId}` : undefined}
      window win as (
        partition by serviceId
        order by createdAt
      )
    )
    where prevState is null
      or state != prevState
      or (
        result is not null and prevResult is not null and (
          json_extract(result, '$.kind') != json_extract(prevResult, '$.kind')
          or json_extract(result, '$.reason') != json_extract(prevResult, '$.reason')
        )
      )
    limit ${pageSize}
    offset ${pageNum * pageSize}`)) as (HistorySelect & { result: string | null; createdAt: number })[]
).map(({ result, createdAt, ...rest }) => ({
  ...rest,
  result: result === null ? null : JSON.parse(result),
  createdAt: new Date(createdAt * 1000),
})) satisfies HistorySelect[];

logger.plain(result);
