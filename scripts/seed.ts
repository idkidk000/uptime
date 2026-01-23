import { env } from 'node:process';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/drizzle';
import {
  groupTable,
  groupToNotifierTable,
  notifierTable,
  type ServiceInsert,
  serviceTable,
} from '@/lib/drizzle/schema';
import { Logger } from '@/lib/logger';
import 'dotenv/config';

const logger = new Logger(import.meta.url);

const [gotifyUrl, gotifyToken] = [env.GOTIFY_URL, env.GOTIFY_TOKEN];

const [groupEntry] = await db
  .insert(groupTable)
  .values({ name: 'Group' })
  .onConflictDoUpdate({ target: groupTable.name, set: { id: sql`id` } })
  .returning();

if (gotifyUrl && gotifyToken) {
  const [notifierEntry] = await db
    .insert(notifierTable)
    .values({
      name: 'Gotify',
      params: {
        kind: 'gotify',
        address: gotifyUrl,
        token: gotifyToken,
      },
    })
    .onConflictDoUpdate({ target: notifierTable.name, set: { id: sql`id` } })
    .returning();

  await db
    .insert(groupToNotifierTable)
    .values({ groupId: groupEntry.id, notifierId: notifierEntry.id })
    .onConflictDoNothing();
}

const services: ServiceInsert[] = [
  {
    groupId: groupEntry.id,
    name: 'JSONata',
    failuresBeforeDown: 3,
    params: {
      kind: 'http',
      address: 'http://localhost:3000/api/mock/json',
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
    name: 'Regex',
    failuresBeforeDown: 3,
    params: {
      kind: 'http',
      address: 'http://localhost:3000/api/mock/json',
      upWhen: {
        statusCode: 200,
        latency: 300,
        query: {
          kind: 'regex',
          expression: '/"ok":true,/u',
          expected: true,
        },
      },
    },
  },
  {
    groupId: groupEntry.id,
    name: 'XPath',
    failuresBeforeDown: 3,
    params: {
      kind: 'http',
      address: 'http://localhost:3000/api/mock/xml',
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
    name: 'DNS',
    failuresBeforeDown: 3,
    params: {
      kind: 'dns',
      address: 'duckduckgo.com',
      recordType: 'A',
      upWhen: {
        includes: ['52.142.124.215'],
        latency: 300,
      },
    },
  },
  {
    groupId: groupEntry.id,
    name: 'Ping',
    failuresBeforeDown: 3,
    params: {
      kind: 'ping',
      address: 'localhost',
      upWhen: {
        latency: 300,
      },
    },
  },
  {
    groupId: groupEntry.id,
    name: 'TCP',
    failuresBeforeDown: 3,
    params: {
      kind: 'tcp',
      address: 'localhost',
      port: 3000,
      upWhen: {
        latency: 300,
      },
    },
  },
  ...((
    env.SSL_HOSTNAMES?.matchAll(/(?<host>[a-z\d.]+):(?<port>\d+)/g)
      .filter(
        (match): match is typeof match & { groups: Record<string, string> } => typeof match.groups !== 'undefined'
      )
      .map((match) => ({
        host: match.groups.host,
        port: Number(match.groups.port),
      }))
      .toArray() ?? []
  ).map(({ host, port }, i) => ({
    groupId: groupEntry.id,
    name: `SSL${i + 1}`,
    failuresBeforeDown: 3,
    checkSeconds: 86400000,
    params: {
      kind: 'ssl',
      address: host,
      port,
      upWhen: {
        latency: 300,
        days: 30,
        trusted: true,
      },
    },
  })) satisfies ServiceInsert[]),
  ...((
    env.DOMAIN_NAMES?.matchAll(/(?<domain>[a-z\d.]+)/g)
      .filter(
        (match): match is typeof match & { groups: Record<string, string> } => typeof match.groups !== 'undefined'
      )
      .map((match) => match.groups.domain)
      .toArray() ?? []
  ).map((domain, i) => ({
    groupId: groupEntry.id,
    name: `Domain${i + 1}`,
    failuresBeforeDown: 3,
    checkSeconds: 86400000,
    params: {
      kind: 'http',
      address: `https://rdap.nominet.uk/uk/domain/${domain}`,
      upWhen: {
        latency: 300,
        query: {
          kind: 'jsonata',
          expression:
            '($toMillis(events[eventAction="expiration"].eventDate) - $toMillis($now())) <= (1000 * 86400 * 28)',
          expected: false,
        },
      },
    },
  })) satisfies ServiceInsert[]),
];

const serviceEntries = await db
  .insert(serviceTable)
  .values(services)
  .onConflictDoUpdate({ target: serviceTable.name, set: { id: sql`id` } })
  .returning();

logger.success({ groupEntry, serviceEntries });
