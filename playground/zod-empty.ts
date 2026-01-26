import { empty, init } from 'zod-empty';
import { serviceInsertSchema } from '@/lib/drizzle/schema';
import { ServerLogger } from '@/lib/logger/server';

const logger = new ServerLogger(import.meta.url);

logger.info(empty(serviceInsertSchema));
logger.info(init(serviceInsertSchema));

const schema = serviceInsertSchema.omit({ params: true });

logger.info(empty(schema));
logger.info(init(schema));
