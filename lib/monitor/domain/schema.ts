import z from 'zod';
import { baseMonitorParamsSchema } from '@/lib/monitor';

export const domainMonitorParamsSchema = baseMonitorParamsSchema.extend({
  address: z.hostname(),
  kind: z.literal('domain'),
  upWhen: z
    .object({
      latency: z.int().min(0).optional(),
      days: z.int().min(0).default(7),
    })
    .optional(),
});

export type DomainMonitorParams = z.infer<typeof domainMonitorParamsSchema>;
