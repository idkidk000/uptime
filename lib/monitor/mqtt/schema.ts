import z from 'zod';
import { baseMonitorParamsSchema, booleanNumberStringUnion } from '@/lib/monitor';

export const mqttMonitorParamsSchema = baseMonitorParamsSchema.extend({
  address: z.union([z.hostname(), z.ipv4(), z.ipv6()]).describe('Hostname or IP'),
  kind: z.literal('mqtt'),
  username: z.string().optional().describe('MQTT username'),
  password: z.string().optional().describe('MQTT password'),
  port: z.int().min(1).max(65535).default(1883).optional().describe('MQTT port number'),
  topic: z.string().describe('MQTT topic'),
  upWhen: z
    .object({
      latency: z.int().min(0).optional().describe('Max latency in ms'),
      query: z
        .discriminatedUnion('kind', [
          z.object({
            kind: z.enum(['jsonata', 'xpath']).describe('Query kind'),
            expression: z.string().describe('Query expression'),
            expected: booleanNumberStringUnion,
          }),
          z.object({
            kind: z.literal('regex').describe('Query kind'),
            expression: z.string().describe('Query expression'),
            expected: z.coerce.boolean().describe('Expected query result'),
          }),
        ])
        .optional(),
    })
    .optional(),
});

export type MqttMonitorParams = z.infer<typeof mqttMonitorParamsSchema>;
