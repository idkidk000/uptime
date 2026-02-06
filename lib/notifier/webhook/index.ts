import type { StatusMessage } from '@/lib/messaging';
import { Notifier } from '@/lib/notifier';
import type { WebhookNotifierParams } from '@/lib/notifier/webhook/schema';

export class WebhookNotifier extends Notifier<WebhookNotifierParams> {
  async send(...messages: StatusMessage[]) {
    const filtered = this.params.statuses
      ? messages.filter((message) => this.params.statuses?.includes(message.kind))
      : messages;
    if (!filtered.length) return;
    await fetch(this.params.address, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.params.headers,
      },
      cache: 'no-store',
      body: JSON.stringify(filtered),
    });
  }
}
