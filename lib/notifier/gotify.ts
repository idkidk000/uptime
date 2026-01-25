import { join } from 'node:path';
import z from 'zod';
import { ServiceStatus } from '@/lib/drizzle/schema';
import { baseNotifierParamsSchema, Notifier } from './base';

export const gotifyNotifierParamsSchema = baseNotifierParamsSchema.extend({
  kind: z.literal('gotify'),
  token: z.string(),
  priority: z
    .object({
      up: z.int(),
      down: z.int(),
    })
    .optional(),
});

export type GotifyNotifierParams = z.infer<typeof gotifyNotifierParamsSchema>;

export class GotifyNotifier extends Notifier<GotifyNotifierParams> {
  async send(status: ServiceStatus, title: string, message: string): Promise<void> {
    const priority = status === ServiceStatus.Up ? this.params.priority?.up : this.params.priority?.down;
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
