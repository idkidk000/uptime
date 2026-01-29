import { z } from 'zod';

export const settingsSchema = z.object({
  history: z
    .object({
      summaryItems: z.int().min(0).default(24),
    })
    .prefault({}),
  monitor: z
    .object({
      concurrency: z.int().min(1).default(4),
      defaultTimeout: z.int().min(0).default(5000),
      enable: z.boolean().default(true),
    })
    .prefault({}),
});

export type Settings = z.infer<typeof settingsSchema>;

export const defaultSettings = settingsSchema.parse({});
