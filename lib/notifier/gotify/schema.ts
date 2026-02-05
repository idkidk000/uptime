import { z } from 'zod';
import { baseNotifierParamsSchema } from '@/lib/notifier';
import { ServiceStatus } from '@/lib/types';
import { typedEntries } from '@/lib/utils';

export const gotifyNotifierParamsSchema = baseNotifierParamsSchema.extend({
  kind: z.literal('gotify'),
  address: z.url({ protocol: /^https?$/ }).describe('Gotify base URL'),
  token: z.string().describe('Gotify app token'),
  priority: z
    .partialRecord(z.enum(ServiceStatus), z.int().optional())
    .optional()
    .describe('Gotify message priority per service status')
    .transform((value) => {
      if (!value) return;
      return Object.fromEntries(typedEntries(value).filter(([, val]) => typeof val === 'number')) as Partial<
        Record<ServiceStatus, number>
      >;
    }),
});

export type GotifyNotifierParams = z.infer<typeof gotifyNotifierParamsSchema>;
