import { z } from 'zod';
import { baseNotifierParamsSchema } from '@/lib/notifier';
import { ServiceStatus } from '@/lib/types';

export const gotifyNotifierParamsSchema = baseNotifierParamsSchema.extend({
  kind: z.literal('gotify'),
  token: z.string(),
  priority: z.partialRecord(z.enum(ServiceStatus), z.int()).optional(),
});

export type GotifyNotifierParams = z.infer<typeof gotifyNotifierParamsSchema>;
