import z from 'zod';
import { baseMonitorParamsSchema } from '@/lib/monitor';

export const sslMonitorParamsSchema = baseMonitorParamsSchema.extend({
  address: z.union([z.hostname(), z.ipv4(), z.ipv6()]).describe('Hostname or IP'),
  kind: z.literal('ssl'),
  port: z.int().min(1).max(65535).default(443).optional().describe('TCP port number'),
  upWhen: z
    .object({
      latency: z.int().min(0).optional().describe('Max latency in ms'),
      days: z.int().min(0).default(7).describe('Min days until. expiry'),
      trusted: z.boolean().optional().describe('Is the certificate expected to be trusted?'),
    })
    .optional(),
});

export type SslMonitorParams = z.infer<typeof sslMonitorParamsSchema>;
