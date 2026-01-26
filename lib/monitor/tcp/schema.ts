import z from 'zod';
import { baseMonitorParamsSchema } from '@/lib/monitor';

export const tcpMonitorParamsSchema = baseMonitorParamsSchema.extend({
  kind: z.literal('tcp'),
  port: z.int().min(1).max(65534),
  upWhen: z.object({ latency: z.int().min(0).optional() }).optional(),
});

export type TcpMonitorParams = z.infer<typeof tcpMonitorParamsSchema>;
