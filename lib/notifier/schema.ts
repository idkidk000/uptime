import { z } from 'zod';
import { gotifyNotifierParamsSchema } from '@/lib/notifier/gotify/schema';
import { webhookNotifierParamsSchema } from '@/lib/notifier/webhook/schema';

export const notifierParamsSchema = z.discriminatedUnion('kind', [
  gotifyNotifierParamsSchema,
  webhookNotifierParamsSchema,
]);

export type NotifierParams = z.infer<typeof notifierParamsSchema>;

export type NotifierKind = NotifierParams['kind'];

export const notifierKinds: NotifierKind[] = ['gotify', 'webhook'];
