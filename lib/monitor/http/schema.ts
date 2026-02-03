import z from 'zod';
import { baseMonitorParamsSchema, booleanNumberStringUnion } from '@/lib/monitor';

export const queryKind = ['jsonata', 'xpath', 'regex'] as const;

export const httpMonitorParamsSchema = baseMonitorParamsSchema.extend({
  address: z.url({ protocol: /^https?$/ }).describe('URL to monitor'),
  kind: z.literal('http'),
  headers: z.record(z.string(), z.string()).optional().describe('Headers in the form `header-name: header-value`'),
  upWhen: z
    .object({
      statusCode: z.int().min(200).max(599).optional().describe('Required status code'),
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

export type HttpMonitorParams = z.infer<typeof httpMonitorParamsSchema>;
