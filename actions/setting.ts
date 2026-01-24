'use server';

import { type } from 'arktype';
import { eq, getTableColumns } from 'drizzle-orm';
import { db } from '@/lib/drizzle';
import { keyValTable } from '@/lib/drizzle/schema';
import { MessageClient } from '@/lib/messaging';
import { defaultSettings, partialSettingsSchema, type Settings } from '@/lib/settings';
import { pick } from '@/lib/utils';

const messageClient = new MessageClient(import.meta.url);

export async function getSettings(): Promise<Settings> {
  const rows = await db
    .select(pick(getTableColumns(keyValTable), ['value']))
    .from(keyValTable)
    .where(eq(keyValTable.key, 'settings'));
  // shouldn't happen. will need to update settings in keyVal on startup to handle schema changes
  if (rows.length === 0) return defaultSettings;
  const settings = rows[0].value as Settings;
  return settings;
}

export async function updateSettings(data: Partial<Settings>): Promise<void> {
  const parsed = partialSettingsSchema(data);
  if (parsed instanceof type.errors) throw parsed;
  const rows = await db
    .select(pick(getTableColumns(keyValTable), ['value']))
    .from(keyValTable)
    .where(eq(keyValTable.key, 'settings'));
  const current = rows.length ? (rows[0].value as Settings) : defaultSettings;
  await db
    .insert(keyValTable)
    .values({ key: 'settings', value: { ...current, parsed } })
    .onConflictDoUpdate({
      target: keyValTable.key,
      set: { value: parsed },
    });
  messageClient.send({ cat: 'invalidation', kind: 'settings', id: 0 });
}
