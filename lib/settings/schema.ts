import { z } from 'zod';
import { init } from 'zod-empty';

export const settingsSchema = z.object({
  historySummaryItems: z.int().min(0).default(24),
  monitorConcurrency: z.int().min(1).default(4),
  defaultMonitorTimeout: z.int().min(0).default(5000),
  disableMonitors: z.boolean().default(false),
});

export const partialSettingsSchema = settingsSchema.partial();

export type Settings = z.infer<typeof settingsSchema>;

export const defaultSettings: Settings = init(settingsSchema);
