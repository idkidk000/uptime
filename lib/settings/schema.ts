import { z } from 'zod';
import { logLevelNames } from '@/lib/logger';

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
    logging: z
      .object({
        rootLevel: z.enum(logLevelNames).default('Info').describe('Root log level'),
        overrides: z
          .array(z.object({ name: z.string().min(1), level: z.enum(logLevelNames) }))
          .default([])
          .describe(
            'Logger name prefix overrides. Setting `workers/` to `Debug:High` would show all log messages for all workers regardless of the root log level'
          ),
      })
      .prefault({}),
    database: z
      .object({
        maintenanceFrequency: z
          .int()
          .min(3600000)
          .max(86400000 * 30)
          .default(86400000)
          .describe('How often to delete expired history and vacuum the databse'),
      })
      .prefault({}),
  })
  .required();

export type Settings = z.infer<typeof settingsSchema>;

export const defaultSettings = settingsSchema.parse({});
