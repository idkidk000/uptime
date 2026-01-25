import z from 'zod';
import { gotifyNotifierParamsSchema } from '@/lib/notifier/gotify';

export const notifierParamsSchema = z.discriminatedUnion('kind', [gotifyNotifierParamsSchema]);

export type NotifierParams = z.infer<typeof notifierParamsSchema>;
