import z from 'zod';
import { baseMonitorParamsSchema } from '@/lib/monitor';

export const tcpMonitorParamsSchema = baseMonitorParamsSchema.extend({
  address: z.union([z.hostname(), z.ipv4(), z.ipv6()]).describe('Hostname or IP'),
  kind: z.literal('tcp'),
  port: z.int().min(1).max(65535).describe('TCP port number'),
  upWhen: z.object({ latency: z.int().min(0).optional().describe('Max latency in ms') }).optional(),
});

export type TcpMonitorParams = z.infer<typeof tcpMonitorParamsSchema>;
