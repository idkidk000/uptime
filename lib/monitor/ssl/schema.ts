import z from 'zod';
import { baseMonitorParamsSchema } from '@/lib/monitor';

export const sslMonitorParamsSchema = baseMonitorParamsSchema.extend({
  address: z.union([z.hostname(), z.ipv4(), z.ipv6()]),
  kind: z.literal('ssl'),
  port: z.int().min(1).max(65535).default(443).optional(),
  upWhen: z
    .object({
      latency: z.int().min(0).optional(),
      days: z.int().min(0).default(7),
      trusted: z.boolean().optional(),
    })
    .optional(),
});

export type SslMonitorParams = z.infer<typeof sslMonitorParamsSchema>;
