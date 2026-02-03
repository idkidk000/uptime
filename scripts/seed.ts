import { env } from 'node:process';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/drizzle';
import { groupTable, groupToNotifierTable, notifierTable, serviceTable } from '@/lib/drizzle/schema';
import 'dotenv/config';
import type { GroupSelect, ServiceInsert } from '@/lib/drizzle/zod/schema';
import { ServerLogger } from '@/lib/logger/server';
import { ServiceStatus } from '@/lib/types';

const logger = new ServerLogger(import.meta.url);

const groupEntries = await db
  .insert(groupTable)
  .values(Array.from({ length: 3 }).map((_, i) => ({ name: `Group ${i + 1}`, active: true })))
  .onConflictDoUpdate({ target: groupTable.name, set: { id: sql`id` } })
  .returning();

const [gotifyUrl, gotifyToken] = [env.GOTIFY_URL, env.GOTIFY_TOKEN];

if (gotifyUrl && gotifyToken) {
  const [notifierEntry] = await db
    .insert(notifierTable)
    .values({
      name: 'Gotify',
      active: true,
      params: {
        kind: 'gotify',
        address: gotifyUrl,
        token: gotifyToken,
        statuses: [ServiceStatus.Up, ServiceStatus.Down],
        priority: {
          [ServiceStatus.Down]: 5,
        },
      },
    })
    .onConflictDoUpdate({ target: notifierTable.name, set: { id: sql`id` } })
    .returning();

  await db
    .insert(groupToNotifierTable)
    .values(groupEntries.map(({ id }) => ({ groupId: id, notifierId: notifierEntry.id })))
    .onConflictDoNothing();
}

const webhookUrl = env.WEBHOOK_URL;

if (webhookUrl) {
  const [notifierEntry] = await db
    .insert(notifierTable)
    .values({
      name: 'Webhook',
      active: true,
      params: {
        kind: 'webhook',
        address: webhookUrl,
        statuses: [ServiceStatus.Up, ServiceStatus.Down],
      },
    })
    .onConflictDoUpdate({ target: notifierTable.name, set: { id: sql`id` } })
    .returning();

  await db
    .insert(groupToNotifierTable)
    .values(groupEntries.map(({ id }) => ({ groupId: id, notifierId: notifierEntry.id })))
    .onConflictDoNothing();
}

function randomGroup(): GroupSelect {
  return groupEntries[Math.floor(Math.random() * groupEntries.length)];
}

const services: ServiceInsert[] = [
  {
    groupId: randomGroup().id,
    name: 'JSONata',
    failuresBeforeDown: 3,
    successesBeforeUp: 0,
    active: true,
    checkSeconds: 60,
    retainCount: 1000,
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
    groupId: randomGroup().id,
    name: 'Regex',
    failuresBeforeDown: 3,
    successesBeforeUp: 0,
    active: true,
    checkSeconds: 60,
    retainCount: 1000,
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
    groupId: randomGroup().id,
    name: 'XPath',
    failuresBeforeDown: 3,
    successesBeforeUp: 0,
    active: true,
    checkSeconds: 60,
    retainCount: 1000,
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
    groupId: randomGroup().id,
    name: 'DNS',
    failuresBeforeDown: 3,
    successesBeforeUp: 0,
    active: true,
    checkSeconds: 60,
    retainCount: 1000,
    params: {
      kind: 'dns',
      address: 'duckduckgo.com',
      recordType: 'A',
      upWhen: {
        includes: ['52.142.124.215'],
      },
    },
  },
  {
    groupId: randomGroup().id,
    name: 'Ping',
    failuresBeforeDown: 3,
    successesBeforeUp: 0,
    active: true,
    checkSeconds: 60,
    retainCount: 1000,
    params: {
      kind: 'ping',
      address: 'localhost',
      upWhen: {
        latency: 5,
        successPercent: 100,
      },
    },
  },
  {
    groupId: randomGroup().id,
    name: 'TCP',
    failuresBeforeDown: 3,
    successesBeforeUp: 0,
    active: true,
    checkSeconds: 60,
    retainCount: 1000,
    params: {
      kind: 'tcp',
      address: 'localhost',
      port: 3000,
      upWhen: {
        latency: 5,
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
    groupId: randomGroup().id,
    name: `SSL${i + 1}`,
    failuresBeforeDown: 0,
    successesBeforeUp: 0,
    checkSeconds: 86400,
    active: true,
    retainCount: 90,
    params: {
      kind: 'ssl',
      address: host,
      port,
      upWhen: {
        days: 30,
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
    groupId: randomGroup().id,
    name: `Domain${i + 1}`,
    failuresBeforeDown: 0,
    successesBeforeUp: 0,
    checkSeconds: 86400,
    active: true,
    retainCount: 90,
    params: {
      kind: 'domain',
      address: domain,
      upWhen: {
        days: 30,
      },
    },
  })) satisfies ServiceInsert[]),
];

const serviceEntries = await db
  .insert(serviceTable)
  .values(services)
  .onConflictDoUpdate({ target: serviceTable.name, set: { id: sql`id` } })
  .returning();

logger.success({ groupEntries, serviceEntries });
