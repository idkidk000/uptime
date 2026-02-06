import type { StatusMessage } from '@/lib/messaging';
import { monitorDownReasons } from '@/lib/monitor';
import { Notifier } from '@/lib/notifier';
import type { GotifyNotifierParams } from '@/lib/notifier/gotify/schema';
import { ServiceStatus, serviceStatuses } from '@/lib/types';
import { enumEntries, pascalToSentenceCase } from '@/lib/utils';

export class GotifyNotifier extends Notifier<GotifyNotifierParams> {
  async send(...messages: StatusMessage[]) {
    for (const status of this.params.statuses ?? enumEntries(ServiceStatus).map(([, val]) => val)) {
      const filtered = messages
        .filter((message) => message.kind === status)
        .toSorted((a, b) => a.name.localeCompare(b.name));
      if (!filtered.length) continue;
      const title = `${filtered.map(({ name }) => name).join(', ')} ${filtered.length > 1 ? 'are' : 'is'} ${serviceStatuses[status].toLocaleLowerCase()}`;
      const body = messages
        .map(
          ({ reason, message }) =>
            `${typeof reason === 'undefined' ? '' : `${pascalToSentenceCase(monitorDownReasons[reason])}: `}${message}`
        )
        .join('\n');
      const priority = this.params.priority?.[status];
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
}
