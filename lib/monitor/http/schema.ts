import z from 'zod';
import { baseMonitorParamsSchema } from '@/lib/monitor';

export const queryKind = ['jsonata', 'xpath', 'regex'] as const;

export const httpMonitorParamsSchema = baseMonitorParamsSchema.extend({
  kind: z.literal('http'),
  headers: z.record(z.string(), z.string()).optional(),
  upWhen: z
    .object({
      statusCode: z.int().min(200).max(599).optional(),
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

export type HttpMonitorParams = z.infer<typeof httpMonitorParamsSchema>;
