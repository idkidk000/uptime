import z from 'zod';
import type { StatusMessage } from '@/lib/messaging';
import { ServiceStatus } from '@/lib/types';

export const baseNotifierParamsSchema = z.object({
  kind: z.string(),
  address: z.url({ protocol: /^https?$/ }),
  statuses: z.enum(ServiceStatus).array().optional(),
});

export type BaseNotifierParams = z.infer<typeof baseNotifierParamsSchema>;

export abstract class Notifier<Params extends BaseNotifierParams = BaseNotifierParams> {
  constructor(public readonly params: Params) {}
  abstract send(message: StatusMessage): Promise<void>;
}
