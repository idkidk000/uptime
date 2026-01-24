import { type } from 'arktype';
import { eq, getTableColumns } from 'drizzle-orm';
import { db } from '@/lib/drizzle';
import { keyValTable } from '@/lib/drizzle/schema';
import { MessageClient } from '@/lib/messaging';
import { pick } from '@/lib/utils';

export const settingsSchema = type({
  historySummaryItems: 'number.integer',
  monitorConcurrency: 'number.integer',
  defaultMonitorTimeout: 'number.integer',
  disableMonitors: 'boolean',
});

export const partialSettingsSchema = settingsSchema.partial();

export type Settings = typeof settingsSchema.infer;

export const defaultSettings: Settings = {
  historySummaryItems: 24,
  monitorConcurrency: 4,
  defaultMonitorTimeout: 5_000,
  disableMonitors: false,
};

// this seems like the least bad way of doing it i suppose
/** you need to pass the awaited result of `getSettings` to the constructor so the getter can be sync. from then on, the settings will be updated live
 *
 * `const settingsClient = new SettingsClient(import.meta.url, await SettingsClient.getSettings(), messageClient)` */
export class SettingsClient {
  #messageClient: MessageClient;
  #current: Settings;
  constructor(
    public readonly importMetaUrl: string,
    initialSettings: Settings,
    messageClient?: MessageClient
  ) {
    this.#current = initialSettings;
    this.#messageClient = messageClient ?? new MessageClient(`${importMetaUrl}:SettingsClient`);
    this.#messageClient.subscribe({ cat: 'invalidation', kind: 'settings' }, () =>
      SettingsClient.getSettings().then((settings) => {
        this.#current = settings;
      })
    );
  }
  get current(): Settings {
    return this.#current;
  }
  static getSettings(): Promise<Settings> {
    return db
      .select(pick(getTableColumns(keyValTable), ['value']))
      .from(keyValTable)
      .where(eq(keyValTable.key, 'settings'))
      .then((rows) => {
        if (rows.length) return rows[0].value as Settings;
        return defaultSettings;
      });
  }
}
