import type { ServiceState } from '@/lib/drizzle/schema';
import type { GotifyNotifierParams } from '@/lib/notifier/gotify';

interface NotifierKindTag {
  kind: string;
}

export interface BaseNotifierParams extends NotifierKindTag {
  address: string;
}

export abstract class Notifier<Params extends BaseNotifierParams = BaseNotifierParams> {
  constructor(public readonly params: Params) {}
  abstract send(state: ServiceState, title: string, message: string): Promise<void>;
}

export type NotifierParams = GotifyNotifierParams;
