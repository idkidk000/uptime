import { sql } from 'drizzle-orm';
import { index, integer, primaryKey, real, sqliteTable, sqliteView, text } from 'drizzle-orm/sqlite-core';
import type { MiniHistory } from '@/lib/drizzle/zod/schema';
import type { MonitorResponse } from '@/lib/monitor';
import type { MonitorParams } from '@/lib/monitor/schema';
import type { NotifierParams } from '@/lib/notifier/schema';
import type { ServiceStatus } from '@/lib/types';

export const notifierTable = sqliteTable('notifier', {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull().unique(),
  active: integer({ mode: 'boolean' }).notNull(),

  params: text({ mode: 'json' }).notNull().$type<NotifierParams>(),

  createdAt: integer({ mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer({ mode: 'timestamp' })
    .notNull()
    .$onUpdate(() => sql`(unixepoch())`),
});

export const groupTable = sqliteTable('group', {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull().unique(),
  createdAt: integer({ mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer({ mode: 'timestamp' })
    .notNull()
    .$onUpdate(() => sql`(unixepoch())`),
});

// TODO: may want to enable this per service instead
// biome-ignore format: no
export const groupToNotifierTable = sqliteTable('groupToNotifier', {
  groupId: integer()
    .notNull()
    .references(() => groupTable.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  notifierId: integer()
    .notNull()
    .references(() => notifierTable.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
}, (table) => [primaryKey({ columns: [table.groupId, table.notifierId] })]);

export const serviceTable = sqliteTable('service', {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull().unique(),
  groupId: integer()
    .notNull()
    .default(1)
    .references(() => groupTable.id, { onDelete: 'set default', onUpdate: 'cascade' }),
  active: integer({ mode: 'boolean' }).notNull(),

  params: text({ mode: 'json' }).notNull().$type<MonitorParams>(),
  checkSeconds: integer().notNull(),
  failuresBeforeDown: integer().notNull(),
  retainCount: integer().notNull(),
  createdAt: integer({ mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer({ mode: 'timestamp' })
    .notNull()
    .$onUpdate(() => sql`(unixepoch())`),
});

/* export const tagTable = sqliteTable('tag',{
  id: integer().primaryKey({autoIncrement:true}),
  name:text().notNull().unique(),
})

export const serviceToTagTable = sqliteTable('serviceToTag',{
  serviceId:integer().notNull().references(()=>serviceTable.id,{onDelete:'cascade',onUpdate:'cascade'}),
  tagId:integer().notNull().references(()=>tagTable.id,{onDelete:'cascade',onUpdate:'cascade'}),
},(table)=>[
  primaryKey({columns:[table.serviceId,table.tagId]})
]) */

// biome-ignore format: no
export const historyTable = sqliteTable('history', {
  id: integer().primaryKey({ autoIncrement: true }),
  serviceId: integer()
    .notNull()
    .references(() => serviceTable.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  result: text({ mode: 'json' }).$type<MonitorResponse | null>(),
  status: integer({ mode: 'number' }).notNull().$type<ServiceStatus>(),
  createdAt: integer({ mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => [index('ix_serviceId_createdAt').on(table.serviceId, table.createdAt)]);

export const stateTable = sqliteTable('state', {
  id: integer()
    .primaryKey()
    .notNull()
    .references(() => serviceTable.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  nextCheckAt: integer({ mode: 'timestamp' }).notNull(),
  failures: integer().notNull(),
  current: text({ mode: 'json' }).$type<MonitorResponse | null>(),
  uptime1d: real().notNull(),
  uptime30d: real().notNull(),
  latency1d: real(),
  status: integer({ mode: 'number' }).notNull().$type<ServiceStatus>(),
  miniHistory: text({ mode: 'json' }).notNull().$type<MiniHistory>(),
  /** when the status changed rather than when the last check was performed */
  changedAt: integer({ mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  createdAt: integer({ mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer({ mode: 'timestamp' })
    .notNull()
    .$onUpdate(() => sql`(unixepoch())`),
});

export const keyValTable = sqliteTable('keyVal', {
  key: text().primaryKey().notNull(),
  value: text({ mode: 'json' }),
});

// getTableColumns doesn't work here so column defs are copied from above
// https://sqlite.org/windowfunctions.html
// https://sqlite.org/json1.html#jex
// https://orm.drizzle.team/docs/goodies#raw-sql-queries-execution
// https://orm.drizzle.team/docs/views#declaring-views
export const historySummaryView = sqliteView('historySummary', {
  name: text().notNull(),
  id: integer().primaryKey({ autoIncrement: true }),
  serviceId: integer().notNull(),
  result: text({ mode: 'json' }).$type<MonitorResponse | null>(),
  status: integer({ mode: 'number' }).notNull().$type<ServiceStatus>(),
  createdAt: integer({ mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}).as(
  sql`
    select
      name,
      id,
      serviceId,
      result,
      status,
      createdAt
    from (
      select
        h.*,
        s.name,
        lag(h.status) over win as prevStatus,
        lag(h.result) over win as prevResult
      from history as h
      inner join service as s on s.id = h.serviceId
      window win as (
        partition by h.serviceId
        order by h.createdAt
      )
    )
    where prevStatus is null
      or status != prevStatus
      or (
        result is not null and prevResult is not null and (
          json_extract(result, '$.kind') != json_extract(prevResult, '$.kind')
          or json_extract(result, '$.reason') != json_extract(prevResult, '$.reason')
          or json_extract(result, '$.message') != json_extract(prevResult, '$.message')
        )
      )
    order by createdAt desc`
);
