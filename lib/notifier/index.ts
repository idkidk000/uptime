import z from 'zod';
import { serviceStatuses } from '@/lib/drizzle/schema';
import type { StatusMessage } from '@/lib/messaging';

export const baseNotifierParamsSchema = z.object({
  kind: z.string(),
  address: z.string(),
  statuses: z.enum(serviceStatuses).array().optional(),
});

export type BaseNotifierParams = z.infer<typeof baseNotifierParamsSchema>;

export abstract class Notifier<Params extends BaseNotifierParams = BaseNotifierParams> {
  constructor(public readonly params: Params) {}
  abstract send(message: StatusMessage): Promise<void>;
}
