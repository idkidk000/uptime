import z from 'zod';
import { baseMonitorParamsSchema } from '@/lib/monitor';

export const tcpMonitorParamsSchema = baseMonitorParamsSchema.extend({
  address: z.union([z.hostname(), z.ipv4(), z.ipv6()]),
  kind: z.literal('tcp'),
  port: z.int().min(1).max(65535),
  upWhen: z.object({ latency: z.int().min(0).optional() }).optional(),
});

export type TcpMonitorParams = z.infer<typeof tcpMonitorParamsSchema>;
