'use server';

import { eq, getTableColumns } from 'drizzle-orm';
import type { ActionResponse } from '@/actions/types';
import { db } from '@/lib/drizzle';
import { keyValTable } from '@/lib/drizzle/schema';
import { ServerLogger } from '@/lib/logger/server';
import { MessageClient } from '@/lib/messaging';
import { defaultSettings, type Settings, settingsSchema } from '@/lib/settings/schema';
import { pick } from '@/lib/utils';

const messageClient = new MessageClient(import.meta.url);
const logger = new ServerLogger(messageClient);

export async function getSettings(): ActionResponse<Settings> {
  try {
    const rows = await db
      .select(pick(getTableColumns(keyValTable), ['value']))
      .from(keyValTable)
      .where(eq(keyValTable.key, 'settings'));
    // deals with no current settings and schema drift
    return { ok: true, data: { ...defaultSettings, ...(rows.at(0)?.value as Settings | undefined) } };
  } catch (error) {
    logger.error(error);
    return { ok: false, error: error instanceof Error ? error : new Error(`${error}`) };
  }
}

export async function updateSettings(data: Settings): ActionResponse<null> {
  try {
    const sanitised = settingsSchema.parse(data);
    await db
      .insert(keyValTable)
      .values({ key: 'settings', value: sanitised })
      .onConflictDoUpdate({
        target: keyValTable.key,
        set: { value: sanitised },
      });
    messageClient.send({ cat: 'invalidation', kind: 'settings', id: 0 });
    return { ok: true, data: null };
  } catch (error) {
    logger.error(error);
    return { ok: false, error: error instanceof Error ? error : new Error(`${error}`) };
  }
}
