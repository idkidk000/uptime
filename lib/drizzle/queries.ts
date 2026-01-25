import type { ResultSet } from '@libsql/client';
import { type SQL, sql, type TableRelationalConfig } from 'drizzle-orm';
import type { SQLiteTransaction } from 'drizzle-orm/sqlite-core';
import { db } from '@/lib/drizzle';
import { type MiniHistory, ServiceStatus } from '@/lib/drizzle/schema';

// passing a typed query to (db|tx).(all|get) returns unknown. seems like a drizzle bug

export interface UptimeSelect {
  uptime30d: number;
  uptime1d: number;
}

/** use with (db|tx).get. the return type is `UptimeSelect` */
export function getUptimeSql(serviceId: number): SQL<UptimeSelect> {
  return sql`
    select
      round(
        100.0
        * cast(coalesce(sum(seconds) filter(where status = ${ServiceStatus.Up}), 0) as real)
        / cast(coalesce(nullif(sum(seconds), 0), 1) as real),
        3
      ) as uptime30d,
      round(
        100.0
        * cast(coalesce(sum(seconds) filter(where status = ${ServiceStatus.Up} and is1d), 0) as real)
        / cast(coalesce(nullif(sum(seconds) filter(where is1d), 0), 1) as real),
        3
      )
      as uptime1d
    from (
      select
        createdAt,
        status,
        coalesce(lead(createdAt) over win, unixepoch()) - createdAt as seconds,
        iif(createdAt >= unixepoch('now', '-1 day'), 1, 0) as is1d
      from history
      where
        serviceId = ${serviceId}
        and createdAt >= unixepoch('now', '-30 day')
        and status != ${ServiceStatus.Paused}
      window win as (
        order by createdAt
      )
    );`;
}

export interface LatencySelect {
  latency1d: number;
}

/** use with (db|tx).get. the return type is `LatencySelect` */
export function getLatencySql(serviceId: number): SQL<LatencySelect> {
  return sql`
    select
      round(
        coalesce(sum(latency), 0) / coalesce(count(1), 1),
        3
      ) as latency1d
    from (
      select
        json_extract(result, '$.latency') as latency
      from history
      where
        serviceId = ${serviceId}
        and createdAt >= unixepoch('now', '-1 day')
        and latency is not null
    )`;
}

const epochSecondsMapper = {
  mapFromDriverValue(value: number) {
    return new Date(value * 1000);
  },
};

const jsonMapper = {
  mapFromDriverValue(value: string) {
    return JSON.parse(value);
  },
};

/** this exists because sql``.mapWith() doesn't work on rows (undocumented) and (db|tx).get() (undocumented) returns the native rather than mapped values */
export function getMiniHistory(
  serviceId: number,
  limit: number,
  tx?: SQLiteTransaction<'async', ResultSet, Record<string, unknown>, Record<string, TableRelationalConfig>>
): Promise<MiniHistory> {
  return (tx ?? db)
    .select({
      from: sql`min(createdAt)`.mapWith(epochSecondsMapper),
      to: sql`max(createdAt)`.mapWith(epochSecondsMapper),
      items: sql`json_group_array(json(obj))`.mapWith(jsonMapper),
    })
    .from(sql`
      (
        select
          createdAt,
          iif(latency is null, obj, json_patch(obj, json_object('latency', latency))) as obj
        from (
          select
            createdAt,
            json_extract(result, '$.latency') as latency,
            json_object(
              'id', id,
              'status', status
            ) as obj
          from history
          where serviceId = ${serviceId}
          order by createdAt desc
          limit ${limit}
        )
        order by createdAt asc
    )`)
    .then(([row]) => row);
}
