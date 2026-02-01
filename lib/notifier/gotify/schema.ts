import { z } from 'zod';
import { baseNotifierParamsSchema } from '@/lib/notifier';
import { ServiceStatus } from '@/lib/types';

export const gotifyNotifierParamsSchema = baseNotifierParamsSchema.extend({
  kind: z.literal('gotify'),
  address: z.url({ protocol: /^https?$/ }).describe('Gotify base URL'),
  token: z.string().describe('Gotify app token'),
  priority: z
    .partialRecord(z.enum(ServiceStatus), z.int())
    .optional()
    .describe('Gotify message priority per service status'),
});

export type GotifyNotifierParams = z.infer<typeof gotifyNotifierParamsSchema>;
