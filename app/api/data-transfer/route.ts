import { sql } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import z from 'zod';
import { dataTransferSchema } from '@/actions/data-transfer/schema';
import { updateSettings } from '@/actions/setting';
import type { WrappedApiResponse } from '@/app/api/types';
import { db } from '@/lib/drizzle';
import {
  groupTable,
  groupToNotifierTable,
  notifierTable,
  serviceTable,
  serviceToTagTable,
  tagTable,
} from '@/lib/drizzle/schema';
import { ServerLogger } from '@/lib/logger/server';
import { MessageClient } from '@/lib/messaging';

const logger = new ServerLogger(import.meta.url);
const messageClient = new MessageClient(import.meta.url);

const postSchema = z.object({
  data: dataTransferSchema,
  replace: z.boolean(),
});
export type DataTransferPost = z.infer<typeof postSchema>;

/* accepts `DataTransferPost` */
export async function POST(request: NextRequest): WrappedApiResponse<null> {
  try {
    const {
      data: { settings, services, groups, notifiers },
      replace,
    } = postSchema.parse(await request.json());

    const response = await updateSettings(settings);
    if (!response.ok) {
      logger.error(response.error);
      return NextResponse.json({ ok: false, error: response.error });
    }
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
    return NextResponse.json({ ok: true, data: null });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error : new Error(`${error}`) });
  }
}
