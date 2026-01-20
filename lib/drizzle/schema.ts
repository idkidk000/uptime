import { sql } from 'drizzle-orm';
import { index, integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type { MonitorParams, MonitorResponse } from '@/lib/monitor';

// TODO: notifiers
interface NotifierParams {
  kind: 'gotify';
  url: string;
  token: string;
  priority?: {
    up: number;
    down: number;
  };
}

export enum ServiceState {
  Up,
  Down,
  Pending,
  Paused,
}

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

  // TODO: recursion
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

export const groupToNotifierTable = sqliteTable(
  'groupToNotifier',
  {
    groupId: integer()
      .notNull()
      .references(() => groupTable.id),
    notifierId: integer()
      .notNull()
      .references(() => notifierTable.id),
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
  groupId: integer()
    .notNull()
    .references(() => groupTable.id),
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

// TODO: index over serviceId include createdAt
export const historyTable = sqliteTable(
  'history',
  {
    id: integer().primaryKey({ autoIncrement: true }),
    serviceId: integer()
      .notNull()
      .references(() => serviceTable.id),
    result: text({ mode: 'json' }).notNull().$type<MonitorResponse>(),
    state: integer({ mode: 'number' }).notNull().$type<ServiceState>(),
    createdAt: integer({ mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    // rowNo: integer().generatedAlwaysAs(sql<number>`row_number() over (partition by serviceId order by createdAt desc)`),
  },
  (table) => [index('createdAt_ix').on(table.createdAt)]
);

export type HistoryTable = typeof historyTable;
export type HistoryInsert = HistoryTable['$inferInsert'];
export type HistorySelect = HistoryTable['$inferSelect'];

// StateTable

export interface MinifiedHistory {
  createdAt: Date;
  state: ServiceState;
  latency?: number;
}

export const stateTable = sqliteTable('state', {
  serviceId: integer()
    .primaryKey()
    .notNull()
    .references(() => serviceTable.id),
  nextCheckAt: integer({ mode: 'timestamp' }).notNull(),
  failures: integer().notNull(),
  current: text({ mode: 'json' }).notNull().$type<MonitorResponse>(),
  uptime1d: real().notNull(),
  uptime30d: real().notNull(),
  latency1d: real(),
  value: integer({ mode: 'number' }).notNull().$type<ServiceState>(),
  historySummary: text({ mode: 'json' }).notNull().$type<MinifiedHistory[]>(),
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
