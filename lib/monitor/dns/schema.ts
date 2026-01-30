import z from 'zod';
import { baseMonitorParamsSchema } from '@/lib/monitor';

export const dnsRecordTypes = ['A', 'AAA', 'CNAME'] as const;

export const dnsMonitorParamsSchema = baseMonitorParamsSchema.extend({
  address: z.hostname(),
  kind: z.literal('dns'),
  recordType: z.enum(dnsRecordTypes).default('A'),
  resolver: z.union([z.hostname(), z.ipv4(), z.ipv6()]).optional(),
  upWhen: z
    .object({
      latency: z.int().min(0).optional(),
      includes: z.union([z.hostname(), z.ipv4(), z.ipv6()]).array().optional(),
      length: z.int().min(0).optional(),
    })
    .optional(),
});

export type DnsMonitorParams = z.infer<typeof dnsMonitorParamsSchema>;
