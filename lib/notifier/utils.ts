import type { Notifier } from '@/lib/notifier';
import { GotifyNotifier } from '@/lib/notifier/gotify';
import type { NotifierParams } from '@/lib/notifier/schema';
import { WebhookNotifier } from '@/lib/notifier/webhook';

export function getNotifier<Params extends NotifierParams>(params: Params): Notifier<Params> {
  if (params.kind === 'gotify') return new GotifyNotifier(params) as Notifier<Params>;
  if (params.kind === 'webhook') return new WebhookNotifier(params) as Notifier<Params>;
  throw new Error(`unhandled notifier kind: ${(params satisfies never as { kind: string }).kind}`);
}
