import z from 'zod';
import { baseMonitorParamsSchema } from '@/lib/monitor';

export const domainMonitorParamsSchema = baseMonitorParamsSchema.extend({
  address: z.hostname().describe('Domain name'),
  kind: z.literal('domain'),
  upWhen: z
    .object({
      latency: z.int().min(0).optional().describe('Max latency in ms'),
      days: z.int().min(0).default(7).describe('Min days until expiry'),
    })
    .optional(),
});

export type DomainMonitorParams = z.infer<typeof domainMonitorParamsSchema>;
