import { z } from 'zod';
import { serviceStatuses } from '@/lib/drizzle/schema';
import { baseNotifierParamsSchema } from '@/lib/notifier';

export const gotifyNotifierParamsSchema = baseNotifierParamsSchema.extend({
  kind: z.literal('gotify'),
  token: z.string(),
  priority: z.record(z.enum(serviceStatuses), z.int()).optional(),
});

export type GotifyNotifierParams = z.infer<typeof gotifyNotifierParamsSchema>;
