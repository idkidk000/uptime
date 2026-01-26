import { getSettings } from '@/actions/setting';
import { MessageClient } from '@/lib/messaging';
import type { Settings } from '@/lib/settings/schema';

/** await the `init()` method before use because async constructors aren't allowed  */
export class SettingsClient {
  #messageClient: MessageClient;
  #current: Settings | null = null;
  // in dev, this should prevent a new instantiation of actions/setting's messageBus on every call. may not be necessary when bundled
  #getSettings = getSettings;
  async #update(): Promise<void> {
    this.#current = await this.#getSettings();
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
