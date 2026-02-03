/** biome-ignore-all lint/suspicious/useAwait: server actions must be async */
'use server';

import { eq, getTableColumns, sql } from 'drizzle-orm';
import { type DataHistory, type DataTransfer, dataTransferSchema } from '@/actions/data-transfer/schema';
import { updateSettings } from '@/actions/setting';
import { db } from '@/lib/drizzle';
import { jsonMapper } from '@/lib/drizzle/queries';
import {
  groupTable,
  groupToNotifierTable,
  historyTable,
  notifierTable,
  serviceTable,
  serviceToTagTable,
  tagTable,
} from '@/lib/drizzle/schema';
import { MessageClient } from '@/lib/messaging';
import { SettingsClient } from '@/lib/settings';
import { omit, pick } from '@/lib/utils';

const messageClient = new MessageClient(import.meta.url);
const settingsClient = await SettingsClient.newAsync(import.meta.url, messageClient);

export async function getData(): Promise<DataTransfer> {
  const settings = settingsClient.current;
  const services = await db
    .select({
      ...omit(getTableColumns(serviceTable), ['id', 'groupId']),
      groupName: groupTable.name,
      tags: sql<string[]>`iif (count(${tagTable.id}) > 0, json_group_array(${tagTable.name}), '[]')`.mapWith(
        jsonMapper
      ),
    })
    .from(serviceTable)
    .innerJoin(groupTable, eq(groupTable.id, serviceTable.groupId))
    .leftJoin(serviceToTagTable, eq(serviceToTagTable.serviceId, serviceTable.id))
    .leftJoin(tagTable, eq(tagTable.id, serviceToTagTable.tagId))
    .groupBy(serviceTable.id);
  const notifiers = await db
    .select(omit(getTableColumns(notifierTable), ['createdAt', 'id', 'updatedAt']))
    .from(notifierTable);
  const groups = await db
    .select({
      ...pick(getTableColumns(groupTable), ['name']),
      notifiers: sql<
        string[]
      >`iif (count(${notifierTable.id})>0, json_group_array(${notifierTable.name}), '[]')`.mapWith(jsonMapper),
    })
    .from(groupTable)
    .leftJoin(groupToNotifierTable, eq(groupToNotifierTable.groupId, groupTable.id))
    .leftJoin(notifierTable, eq(notifierTable.id, groupToNotifierTable.notifierId))
    .groupBy(groupTable.id);
  return { settings, notifiers, groups, services };
}

export async function setData(data: DataTransfer, replace: boolean): Promise<void> {
  const { settings, services, groups, notifiers } = dataTransferSchema.parse(data);
  await updateSettings(settings);
  if (replace) {
    // schema is mostly delete cascade so this should cover everything
    await db.delete(serviceTable);
    await db.delete(groupTable);
    await db.delete(notifierTable);
    await db.delete(tagTable);
  }
  if (notifiers.length)
    await db
      .insert(notifierTable)
      .values(notifiers)
      .onConflictDoUpdate({
        target: notifierTable.name,
        set: { active: sql`excluded.active`, params: sql`excluded.params` },
      });
  if (groups.length)
    await db
      .insert(groupTable)
      .values(groups.map(({ name }) => ({ name })))
      .onConflictDoNothing();
  const groupNotifiers = groups.flatMap(({ name, notifiers }) =>
    notifiers.map((notifier) => ({
      notifierId: sql`(select ${notifierTable.id} from ${notifierTable} where ${notifierTable.name} = ${notifier})`,
      groupId: sql`(select ${groupTable.id} from ${groupTable} where ${groupTable.name} = ${name})`,
    }))
  );
  if (groupNotifiers.length) await db.insert(groupToNotifierTable).values(groupNotifiers).onConflictDoNothing();
  if (services.length)
    await db
      .insert(serviceTable)
      .values(
        services.map(({ groupName, tags: _tags, ...service }) => ({
          ...service,
          groupId: sql`(select ${groupTable.id} from ${groupTable} where ${groupTable.name} = ${groupName})`,
        }))
      )
      .onConflictDoUpdate({
        target: serviceTable.name,
        set: {
          active: sql`excluded.active`,
          checkSeconds: sql`excluded.checkSeconds`,
          failuresBeforeDown: sql`excluded.failuresBeforeDown`,
          groupId: sql`excluded.groupId`,
          params: sql`excluded.params`,
          retainCount: sql`excluded.retainCount`,
          successesBeforeUp: sql`excluded.successesBeforeUp`,
        },
      });
  const tags = new Set(services.flatMap(({ tags }) => tags));
  if (tags.size) {
    await db
      .insert(tagTable)
      .values([...tags].map((name) => ({ name })))
      .onConflictDoNothing();
    await db
      .insert(serviceToTagTable)
      .values(
        services.flatMap((service) =>
          service.tags.map((tag) => ({
            serviceId: sql`(select ${serviceTable.id} from ${serviceTable} where ${serviceTable.name} = ${service.name})`,
            tagId: sql`(select ${tagTable.id} from ${tagTable} where ${tagTable.name}=${tag})`,
          }))
        )
      )
      .onConflictDoNothing();
  }
  // workers which use caching (monitor, notify) validate updatedAt
  messageClient.send({ cat: 'client-action', kind: 'reload' });
}

export async function getHistory(): Promise<DataHistory[]> {
  const data = await db
    .select({ ...omit(getTableColumns(historyTable), ['serviceId']), name: serviceTable.name })
    .from(serviceTable)
    .innerJoin(historyTable, eq(historyTable.serviceId, serviceTable.id));
  return data;
}
