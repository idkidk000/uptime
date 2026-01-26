'use server';

import { eq, getTableColumns } from 'drizzle-orm';
import { db } from '@/lib/drizzle';
import { keyValTable } from '@/lib/drizzle/schema';
import { MessageClient } from '@/lib/messaging';
import { defaultSettings, type Settings, settingsSchema } from '@/lib/settings/schema';
import { pick } from '@/lib/utils';

const messageClient = new MessageClient(import.meta.url);

export async function getSettings(): Promise<Settings> {
  const rows = await db
    .select(pick(getTableColumns(keyValTable), ['value']))
    .from(keyValTable)
    .where(eq(keyValTable.key, 'settings'));
  // deals with no current settings and schema drift
  return { ...defaultSettings, ...(rows.at(0)?.value as Settings | undefined) };
}

export async function updateSettings(data: Settings): Promise<void> {
  const sanitised = settingsSchema.parse(data);
  await db
    .insert(keyValTable)
    .values({ key: 'settings', value: sanitised })
    .onConflictDoUpdate({
      target: keyValTable.key,
      set: { value: sanitised },
    });
  messageClient.send({ cat: 'invalidation', kind: 'settings', id: 0 });
}
