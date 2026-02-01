import z from 'zod';
import { baseMonitorParamsSchema } from '@/lib/monitor';

export const dnsRecordTypes = ['A', 'AAA', 'CNAME'] as const;

export const dnsMonitorParamsSchema = baseMonitorParamsSchema.extend({
  address: z.hostname().describe('Hostname'),
  kind: z.literal('dns'),
  recordType: z.enum(dnsRecordTypes).default('A').describe('DNS record type').nonoptional(),
  resolver: z.union([z.hostname(), z.ipv4(), z.ipv6()]).optional().describe('DNS resolver'),
  upWhen: z
    .object({
      latency: z.int().min(0).optional().describe('Max latency in ms'),
      includes: z.union([z.hostname(), z.ipv4(), z.ipv6()]).array().optional().describe('Records required in response'),
      length: z.int().min(0).optional().describe('Count of records in response'),
    })
    .optional(),
});

export type DnsMonitorParams = z.infer<typeof dnsMonitorParamsSchema>;
