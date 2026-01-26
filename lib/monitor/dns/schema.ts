import z from 'zod';
import { baseMonitorParamsSchema } from '@/lib/monitor';

export const dnsMonitorParamsSchema = baseMonitorParamsSchema.extend({
  kind: z.literal('dns'),
  recordType: z.enum(['A', 'AAA', 'CNAME']).default('A'),
  resolver: z.string().optional(),
  upWhen: z
    .object({
      latency: z.int().min(0).optional(),
      includes: z.string().array().optional(),
      length: z.int().min(0).optional(),
    })
    .optional(),
});

export type DnsMonitorParams = z.infer<typeof dnsMonitorParamsSchema>;
