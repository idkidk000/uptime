import { type SQL, sql } from 'drizzle-orm';
import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type { MonitorParams, MonitorResponse } from '@/lib/monitor';

interface NotifierParams {
  kind: 'gotify';
  url: string;
  token: string;
  priority?: {
    up: number;
    down: number;
  };
}

export const monitorStates = ['up', 'down', 'pending'] as const;
export type MonitorState = (typeof monitorStates)[number];

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

  parent: integer(), //.references(() => groupTable.id),

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

// MonitorTable

export const monitorTable = sqliteTable('monitor', {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull().unique(),
  groupId: integer()
    .notNull()
    .references(() => groupTable.id),
  active: integer({ mode: 'boolean' }).notNull().default(true),

  params: text({ mode: 'json' }).notNull().$type<MonitorParams>(),
  checkSeconds: integer().notNull().default(60),
  failuresBeforeDown: integer().notNull().default(0),

  checkedAt: integer({ mode: 'timestamp' }),
  successiveFailures: integer().notNull().default(-1),
  state: text()
    .generatedAlwaysAs(
      (): SQL =>
        sql`iif(${monitorTable.successiveFailures} = 0, 'up',iif(${monitorTable.successiveFailures} >= ${monitorTable.failuresBeforeDown}, 'down', 'pending'))`
    )
    .$type<MonitorState>(),

  retainCount: integer().notNull().default(10080),
  createdAt: integer({ mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer({ mode: 'timestamp' })
    .notNull()
    .$onUpdate(() => sql`(unixepoch())`),
});

export type MonitorTable = typeof monitorTable;
export type MonitorInsert = MonitorTable['$inferInsert'];
export type MonitorSelect = MonitorTable['$inferSelect'];

// HistoryTable

export const historyTable = sqliteTable('history', {
  id: integer().primaryKey({ autoIncrement: true }),
  monitorId: integer()
    .notNull()
    .references(() => monitorTable.id),
  result: text({ mode: 'json' }).notNull().$type<MonitorResponse>(),
  createdAt: integer({ mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export type HistoryTable = typeof historyTable;
export type HistoryInsert = HistoryTable['$inferInsert'];
export type HistorySelect = HistoryTable['$inferSelect'];
