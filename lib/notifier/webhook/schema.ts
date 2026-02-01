import { z } from 'zod';
import { baseNotifierParamsSchema } from '@/lib/notifier';

export const webhookNotifierParamsSchema = baseNotifierParamsSchema.extend({
  kind: z.literal('webhook'),
  address: z.url({ protocol: /^https?$/ }).describe('Webhook URL'),
  headers: z.record(z.string(), z.string()).optional().describe('HTTP headers in the form `header-name: header-value`'),
});

export type WebhookNotifierParams = z.infer<typeof webhookNotifierParamsSchema>;
