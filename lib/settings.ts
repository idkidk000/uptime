import { z } from 'zod';
import { getSettings } from '@/actions/setting';
import { MessageClient } from '@/lib/messaging';

export const settingsSchema = z.object({
  historySummaryItems: z.int().min(0),
  monitorConcurrency: z.int().min(1),
  defaultMonitorTimeout: z.int().min(0),
  disableMonitors: z.boolean(),
});

export const partialSettingsSchema = settingsSchema.partial();

export type Settings = z.infer<typeof settingsSchema>;

export const defaultSettings: Settings = {
  historySummaryItems: 24,
  monitorConcurrency: 4,
  defaultMonitorTimeout: 5_000,
  disableMonitors: false,
};

/** await the `init()` method before use because async constructors aren't allowed  */
export class SettingsClient {
  #messageClient: MessageClient;
  #current: Settings | null = null;
  async #update(): Promise<void> {
    this.#current = await getSettings();
  }
  constructor(
    public readonly importMetaUrl: string,
    messageClient?: MessageClient
  ) {
    this.#messageClient = messageClient ?? new MessageClient(`${importMetaUrl}:SettingsClient`);
    this.#messageClient.subscribe({ cat: 'invalidation', kind: 'settings' }, () => this.#update());
  }
  async init(): Promise<void> {
    await this.#update();
  }
  get current(): Settings {
    if (this.#current === null) throw new Error('you need to await the `init` method first');
    return this.#current;
  }
}
