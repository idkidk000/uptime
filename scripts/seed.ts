import { sql } from 'drizzle-orm';
import { db } from '@/lib/drizzle';
import { groupTable, type ServiceInsert, serviceTable } from '@/lib/drizzle/schema';
import { Logger } from '@/lib/logger';

const logger = new Logger(import.meta.url);

const [groupEntry] = await db
  .insert(groupTable)
  .values({ name: 'Group 1' })
  .onConflictDoUpdate({ target: groupTable.name, set: { id: sql`id` } })
  .returning();

const services: ServiceInsert[] = [
  {
    groupId: groupEntry.id,
    name: 'JSONata 1',
    failuresBeforeDown: 3,
    params: {
      kind: 'http',
      url: 'http://localhost:3000/api/mock/json',
      upWhen: {
        statusCode: 200,
        latency: 300,
        query: {
          kind: 'jsonata',
          expression: 'ok',
          expected: true,
        },
      },
    },
  },
  {
    groupId: groupEntry.id,
    name: 'Regex 1',
    failuresBeforeDown: 3,
    params: {
      kind: 'http',
      url: 'http://localhost:3000/api/mock/json',
      upWhen: {
        statusCode: 200,
        latency: 300,
        query: {
          kind: 'regex',
          expression: '/\\b"ok":true\\b/u',
          expected: true,
        },
      },
    },
  },
  {
    groupId: groupEntry.id,
    name: 'XPath 1',
    failuresBeforeDown: 3,
    params: {
      kind: 'http',
      url: 'http://localhost:3000/api/mock/xml',
      upWhen: {
        statusCode: 200,
        latency: 300,
        query: {
          kind: 'xpath',
          expression: '/message/ok',
          expected: '<ok>true</ok>',
        },
      },
    },
  },
  {
    groupId: groupEntry.id,
    name: 'Down 1',
    failuresBeforeDown: 3,
    params: {
      kind: 'http',
      url: 'http://localhost:3000/api/mock/xml',
      upWhen: {
        statusCode: 200,
        latency: 300,
        query: {
          kind: 'xpath',
          expression: '/message/ok',
          expected: 'somethingElse',
        },
      },
    },
  },
];

const serviceEntries = await db
  .insert(serviceTable)
  .values(services)
  .onConflictDoUpdate({ target: serviceTable.name, set: { id: sql`id` } })
  .returning();

logger.success({ groupEntry, serviceEntries });
