import { z } from 'zod';
import { baseNotifierParamsSchema } from '@/lib/notifier';

export const webhookNotifierParamsSchema = baseNotifierParamsSchema.extend({
  kind: z.literal('webhook'),
  headers: z.record(z.string(), z.string()).optional(),
});

export type WebhookNotifierParams = z.infer<typeof webhookNotifierParamsSchema>;
