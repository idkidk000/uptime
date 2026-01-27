import { empty, init } from 'zod-empty';
import { serviceInsertSchema } from '@/lib/drizzle/schema';
import { ServerLogger } from '@/lib/logger/server';

const logger = new ServerLogger(import.meta.url);

logger.plain(empty(serviceInsertSchema));
logger.plain(init(serviceInsertSchema));

const schema = serviceInsertSchema.omit({ params: true });

logger.plain(empty(schema));
logger.plain(init(schema));
