import z from 'zod';
import { type GroupSelect, groupInsertSchema } from '@/lib/drizzle/zod/schema';

export const groupInsertWithNotifiersSchema = groupInsertSchema.extend({
  notifiers: z.array(z.int().min(1)),
});
export type GroupInsertWithNotifiers = z.infer<typeof groupInsertWithNotifiersSchema>;

export const groupUpdateWithNotifiersSchema = groupInsertWithNotifiersSchema.extend({
  id: z.int().min(1),
});
export type GroupUpdateWithNotifiers = z.infer<typeof groupUpdateWithNotifiersSchema>;

export interface GroupSelectWithNotifiers extends GroupSelect {
  notifiers: number[];
}
