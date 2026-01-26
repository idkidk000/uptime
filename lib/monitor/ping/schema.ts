import z from 'zod';
import { baseMonitorParamsSchema } from '@/lib/monitor';

export const pingMonitorParamsSchema = baseMonitorParamsSchema.extend({
  kind: z.literal('ping'),
  upWhen: z
    .object({
      latency: z.int().min(0).optional(),
      successPercent: z.number().min(0).max(100).optional().default(100),
    })
    .optional(),
});

export type PingMonitorParams = z.infer<typeof pingMonitorParamsSchema>;
