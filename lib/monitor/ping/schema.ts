import z from 'zod';
import { baseMonitorParamsSchema } from '@/lib/monitor';

export const pingMonitorParamsSchema = baseMonitorParamsSchema.extend({
  address: z.union([z.hostname(), z.ipv4(), z.ipv6()]).describe('Hostname or IP'),
  kind: z.literal('ping'),
  upWhen: z
    .object({
      latency: z.int().min(0).optional().describe('Max latency in ms'),
      successPercent: z.number().min(0).max(100).optional().default(100).describe('Min success percent'),
    })
    .optional(),
});

export type PingMonitorParams = z.infer<typeof pingMonitorParamsSchema>;
