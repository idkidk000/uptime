import { join } from 'node:path';
import { ServiceState } from '@/lib/drizzle/schema';
import { type BaseNotifierParams, Notifier } from '@/lib/notifier';

export interface GotifyNotifierParams extends BaseNotifierParams {
  kind: 'gotify';
  token: string;
  priority?: {
    up: number;
    down: number;
  };
}

export class GotifyNotifier extends Notifier<GotifyNotifierParams> {
  async send(state: ServiceState, title: string, message: string): Promise<void> {
    const priority = state === ServiceState.Up ? this.params.priority?.up : this.params.priority?.down;
    await fetch(join(this.params.address, 'message'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Gotify-Key': this.params.token,
      },
      body: JSON.stringify({ title, message, priority }),
    });
  }
}
