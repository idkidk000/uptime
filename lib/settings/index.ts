import { getSettings } from '@/actions/setting';
import { MessageClient } from '@/lib/messaging';
import type { Settings } from '@/lib/settings/schema';

/** not constructable directly. await SettingsClient.newAsync() to get a new instance  */
export class SettingsClient {
  #messageClient: MessageClient;
  #current: Settings | null = null;
  async #update(): Promise<void> {
    const response = await getSettings();
    if (response.ok) this.#current = response.data;
    else throw response.error;
  }
  // biome-ignore format: no
  private constructor(public readonly importMetaUrl: string, messageClient?: MessageClient) {
    this.#messageClient = messageClient ?? new MessageClient(`${importMetaUrl}:SettingsClient`);
    this.#messageClient.subscribe({ cat: 'invalidation', kind: 'settings' }, () => this.#update());
  }
  get current(): Settings {
    if (this.#current === null) throw new Error('you need to await the `init` method first');
    return this.#current;
  }
  /** async constructor */
  static async newAsync(importMetaUrl: string, messageClient?: MessageClient): Promise<SettingsClient> {
    const client = new SettingsClient(importMetaUrl, messageClient);
    await client.#update();
    return client;
  }
}
