import { z } from 'zod';

export const settingsSchema = z
  .object({
    history: z
      .object({
        summaryItems: z.int().min(0).default(24).describe('Number of ticks to show in bar graph'),
      })
      .prefault({}),
    monitor: z
      .object({
        concurrency: z.int().min(1).default(4).describe('Number of monitor checks to run concurrently'),
        defaultTimeout: z.int().min(0).default(5000).describe('Default timeout for monitors'),
        enable: z.boolean().default(true).describe('Scheduler override'),
      })
      .prefault({}),
    sse: z
      .object({
        throttle: z.int().min(0).default(250).describe('Throttle for client updates and invalidations'),
      })
      .prefault({}),
  })
  .required();

export type Settings = z.infer<typeof settingsSchema>;

export const defaultSettings = settingsSchema.parse({});
