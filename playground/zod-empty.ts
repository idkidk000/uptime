import { empty, init } from 'zod-empty';
import { serviceInsertSchema } from '@/lib/drizzle/schema';
import { ServerLogger } from '@/lib/logger/server';
import { settingsSchema } from '@/lib/settings/schema';

const logger = new ServerLogger(import.meta.url);

// logger.plain(empty(settingsSchema));
// logger.plain(init(settingsSchema));

logger.plain(settingsSchema.shape);

// const schema = serviceInsertSchema.omit({ params: true });

// logger.plain(empty(schema));
// logger.plain(init(schema));
