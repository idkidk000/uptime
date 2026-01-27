import 'dotenv/config';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '@/lib/drizzle/schema';

const LOG_QUERIES = false;

const dbFileName = process.env.DB_FILE_NAME ?? '.local/data.db';

export const db = drizzle(dbFileName, { logger: LOG_QUERIES, schema });
