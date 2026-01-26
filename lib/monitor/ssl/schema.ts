import z from 'zod';
import { baseMonitorParamsSchema } from '@/lib/monitor';

export const sslMonitorParamsSchema = baseMonitorParamsSchema.extend({
  kind: z.literal('ssl'),
  port: z.int().min(1).max(65534).default(443),
  upWhen: z
    .object({
      latency: z.int().min(0).optional(),
      days: z.int().min(0).default(7),
      trusted: z.boolean().optional(),
    })
    .optional(),
});

export type SslMonitorParams = z.infer<typeof sslMonitorParamsSchema>;
