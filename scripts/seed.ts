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
    params: {
      kind: 'http',
      url: 'http://192.168.1.250:8996/api/ping',
      upWhen: {
        statusCode: 200,
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
    params: {
      kind: 'http',
      url: 'http://192.168.1.250:8996/api/ping',
      upWhen: {
        statusCode: 200,
        query: {
          kind: 'regex',
          expression: '/\\{"ok":true\\}/u',
          expected: true,
        },
      },
    },
  },
  {
    groupId: groupEntry.id,
    name: 'XPath 1',
    params: {
      kind: 'http',
      url: 'http://192.168.1.187',
      upWhen: {
        statusCode: 200,
        query: {
          kind: 'xpath',
          expression: '/html/body/esp-app',
          expected: '<esp-app/>',
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
