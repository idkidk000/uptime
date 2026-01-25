import type { ServiceStatus } from '@/lib/drizzle/schema';
import z from '@/node_modules/zod/v4/classic/external.cjs';

export const baseNotifierParamsSchema = z.object({
  kind: z.string(),
  address: z.string(),
});

export type BaseNotifierParams = z.infer<typeof baseNotifierParamsSchema>;

export abstract class Notifier<Params extends BaseNotifierParams = BaseNotifierParams> {
  constructor(public readonly params: Params) {}
  abstract send(status: ServiceStatus, title: string, message: string): Promise<void>;
}
