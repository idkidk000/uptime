import z from 'zod';
import {
  groupInsertSchema,
  type HistorySelect,
  notifierInsertSchema,
  serviceInsertSchema,
} from '@/lib/drizzle/zod/schema';
import { settingsSchema } from '@/lib/settings/schema';

export const dataTransferSchema = z.object({
  notifiers: z.array(notifierInsertSchema),
  groups: z.array(groupInsertSchema.extend({ notifiers: z.array(z.string()) })),
  settings: settingsSchema,
  services: z.array(
    serviceInsertSchema.omit({ groupId: true }).extend({ groupName: z.string(), tags: z.array(z.string()) })
  ),
});

export const dataTransferJsonSchema = dataTransferSchema.toJSONSchema({ io: 'input', target: 'openapi-3.0' });

export type DataTransfer = z.infer<typeof dataTransferSchema>;

export interface DataHistory extends Omit<HistorySelect, 'serviceId'> {
  name: string;
}

export const dataTransferPostSchema = z.object({
  data: dataTransferSchema,
  replace: z.boolean(),
});

export type DataTransferPost = z.infer<typeof dataTransferPostSchema>;
