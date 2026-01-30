import z from 'zod';
import { baseMonitorParamsSchema } from '@/lib/monitor';

export const mqttMonitorParamsSchema = baseMonitorParamsSchema.extend({
  address: z.hostname(),
  kind: z.literal('mqtt'),
  username: z.string().optional(),
  password: z.string().optional(),
  port: z.int().min(1).max(65535).default(1883).optional(),
  topic: z.string(),
  upWhen: z
    .object({
      latency: z.int().min(0).optional(),
      query: z
        .discriminatedUnion('kind', [
          z.object({
            kind: z.enum(['jsonata', 'xpath']),
            expression: z.string(),
            expected: z.union([z.coerce.number(), z.coerce.boolean(), z.string()]),
          }),
          z.object({
            kind: z.literal('regex'),
            expression: z.string(),
            expected: z.coerce.boolean(),
          }),
        ])
        .optional(),
    })
    .optional(),
});

export type MqttMonitorParams = z.infer<typeof mqttMonitorParamsSchema>;
