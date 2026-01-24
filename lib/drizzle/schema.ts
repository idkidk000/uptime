import { sql } from 'drizzle-orm';
import { index, integer, primaryKey, real, sqliteTable, sqliteView, text } from 'drizzle-orm/sqlite-core';
import type { MonitorParams, MonitorResponse } from '@/lib/monitor';
import type { NotifierParams } from '@/lib/notifier';
import { enumToObject } from '@/lib/utils';

export enum ServiceState {
  Up,
  Down,
  Pending,
  Paused,
}

export type ServiceStateName = keyof typeof ServiceState;
export const serviceStates = enumToObject(ServiceState);

// NotifierTable

export const notifierTable = sqliteTable('notifier', {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull().unique(),
  active: integer({ mode: 'boolean' }).notNull().default(true),

  params: text({ mode: 'json' }).notNull().$type<NotifierParams>(),

  createdAt: integer({ mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer({ mode: 'timestamp' })
    .notNull()
    .$onUpdate(() => sql`(unixepoch())`),
});

export type NotifierTable = typeof notifierTable;
export type NotifierInsert = NotifierTable['$inferInsert'];
export type NotifierSelect = NotifierTable['$inferSelect'];

// GroupTable

export const groupTable = sqliteTable('group', {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull().unique(),
  active: integer({ mode: 'boolean' }).notNull().default(true),

  // i don't *think* it's valid to have an fk reference its own table
  // parent: integer(), //.references(() => groupTable.id),

  createdAt: integer({ mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer({ mode: 'timestamp' })
    .notNull()
    .$onUpdate(() => sql`(unixepoch())`),
});

export type GroupTable = typeof groupTable;
export type GroupInsert = GroupTable['$inferInsert'];
export type GroupSelect = GroupTable['$inferSelect'];

// GroupToNotifierTable

// TODO: may want to enable this per service instead
export const groupToNotifierTable = sqliteTable(
  'groupToNotifier',
  {
    groupId: integer()
      .notNull()
      .references(() => groupTable.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    notifierId: integer()
      .notNull()
      .references(() => notifierTable.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.groupId, table.notifierId] })]
);

export type GroupToNotifierTable = typeof groupToNotifierTable;
export type GroupToNotifierInsert = GroupToNotifierTable['$inferInsert'];
export type GroupToNotifierSelect = GroupToNotifierTable['$inferSelect'];

// ServiceTable

export const serviceTable = sqliteTable('service', {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull().unique(),
  // TODO: maybe seed a root group with a known id. then this would be notNull().default(knownId) and have { onDelete: 'set default' }. i think i could make it undeletable with a trigger
  groupId: integer().references(() => groupTable.id, { onDelete: 'set null', onUpdate: 'cascade' }),
  active: integer({ mode: 'boolean' }).notNull().default(true),

  params: text({ mode: 'json' }).notNull().$type<MonitorParams>(),
  checkSeconds: integer().notNull().default(60),
  failuresBeforeDown: integer().notNull().default(0),
  retainCount: integer().notNull().default(10080),
  createdAt: integer({ mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer({ mode: 'timestamp' })
    .notNull()
    .$onUpdate(() => sql`(unixepoch())`),
});

export type ServiceTable = typeof serviceTable;
export type ServiceInsert = ServiceTable['$inferInsert'];
export type ServiceSelect = ServiceTable['$inferSelect'];

// HistoryTable

export const historyTable = sqliteTable(
  'history',
  {
    id: integer().primaryKey({ autoIncrement: true }),
    serviceId: integer()
      .notNull()
      .references(() => serviceTable.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    result: text({ mode: 'json' }).$type<MonitorResponse | null>(),
    state: integer({ mode: 'number' }).notNull().$type<ServiceState>(),
    createdAt: integer({ mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  },
  (table) => [index('ix_serviceId_createdAt').on(table.serviceId, table.createdAt)]
);

export type HistoryTable = typeof historyTable;
export type HistoryInsert = HistoryTable['$inferInsert'];
export type HistorySelect = HistoryTable['$inferSelect'];

// StateTable

export interface MiniHistory {
  from: Date;
  to: Date;
  items: { id: number; state: ServiceState; latency?: number }[];
}

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
  // FIXME: rename this and the enum to status
  value: integer({ mode: 'number' }).notNull().$type<ServiceState>(),
  miniHistory: text({ mode: 'json' }).notNull().$type<MiniHistory>(),
  /** when the status changed rather than when the last check was performed */
  changedAt: integer({ mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  createdAt: integer({ mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer({ mode: 'timestamp' })
    .notNull()
    .$onUpdate(() => sql`(unixepoch())`),
});

export type StateTable = typeof stateTable;
export type StateInsert = StateTable['$inferInsert'];
export type StateSelect = StateTable['$inferSelect'];

export interface ServiceWithState extends ServiceSelect {
  state: StateSelect | null;
}

// KeyValTable (config, etc)

export const keyValTable = sqliteTable('keyVal', {
  key: text().primaryKey().notNull(),
  value: text({ mode: 'json' }),
});

export type KeyValTable = typeof keyValTable;
export type KeyValInsert = KeyValTable['$inferInsert'];
export type KeyValSelect = KeyValTable['$inferSelect'];

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
  state: integer({ mode: 'number' }).notNull().$type<ServiceState>(),
  createdAt: integer({ mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}).as(
  sql`
    select
      name,
      id,
      serviceId,
      result,
      state,
      createdAt
    from (
      select
        h.*,
        s.name,
        lag(h.state) over win as prevState,
        lag(h.result) over win as prevResult
      from history as h
      inner join service as s on s.id = h.serviceId
      window win as (
        partition by h.serviceId
        order by h.createdAt
      )
    )
    where prevState is null
      or state != prevState
      or (
        result is not null and prevResult is not null and (
          json_extract(result, '$.kind') != json_extract(prevResult, '$.kind')
          or json_extract(result, '$.reason') != json_extract(prevResult, '$.reason')
          or json_extract(result, '$.message') != json_extract(prevResult, '$.message')
        )
      )
    order by createdAt desc`
);

export interface HistorySummarySelect extends HistorySelect {
  name: string;
}
