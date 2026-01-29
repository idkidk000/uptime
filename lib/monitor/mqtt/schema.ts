import z from 'zod';
import { baseMonitorParamsSchema } from '@/lib/monitor';

export const mqttMonitorParamsSchema = baseMonitorParamsSchema.extend({
  kind: z.literal('mqtt'),
  username: z.string().optional(),
  password: z.string().optional(),
  port: z.int().min(1).default(1833),
  topic: z.string(),
  upWhen: z
    .object({
      latency: z.int().min(0).optional(),
      query: z
        .discriminatedUnion('kind', [
          z.object({
            kind: z.enum(['jsonata', 'xpath']),
            expression: z.string(),
            expected: z.unknown(),
          }),
          z.object({
            kind: z.literal('regex'),
            expression: z.string(),
            expected: z.boolean(),
          }),
        ])
        .optional(),
    })
    .optional(),
});

export type MqttMonitorParams = z.infer<typeof mqttMonitorParamsSchema>;
