import { join } from 'node:path';
import type { StatusMessage } from '@/lib/messaging';
import { Notifier } from '@/lib/notifier';
import type { WebhookNotifierParams } from '@/lib/notifier/webhook/schema';

export class WebhookNotifier extends Notifier<WebhookNotifierParams> {
  async send(message: StatusMessage) {
    if (this.params.statuses && !this.params.statuses.includes(message.kind)) return;
    await fetch(join(this.params.address, 'message'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.params.headers,
      },
      body: JSON.stringify(message),
    });
  }
}
