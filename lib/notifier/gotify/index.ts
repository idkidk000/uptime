import { serviceStatuses } from '@/lib/drizzle/schema';
import type { StatusMessage } from '@/lib/messaging';
import { monitorDownReasons } from '@/lib/monitor';
import { Notifier } from '@/lib/notifier';
import type { GotifyNotifierParams } from '@/lib/notifier/gotify/schema';
import { pascalToSentenceCase } from '@/lib/utils';

export class GotifyNotifier extends Notifier<GotifyNotifierParams> {
  async send(message: StatusMessage) {
    if (this.params.statuses && !this.params.statuses.includes(message.kind)) return;
    const title = `${message.name} is ${serviceStatuses[message.kind].toLocaleLowerCase()}`;
    const body = `${typeof message.reason === 'undefined' ? '' : `${pascalToSentenceCase(monitorDownReasons[message.reason])}: `}${message.message}`;
    // undefined uses the gotify app's default (normally 0)
    const priority = this.params.priority?.[message.kind];
    await fetch(new URL('message', this.params.address), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Gotify-Key': this.params.token,
      },
      body: JSON.stringify({ title, message: body, priority }),
      cache: 'no-store',
    });
  }
}
