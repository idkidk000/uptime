import 'dotenv/config';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

const LOG_QUERIES = false;

const dbFileName = process.env.DB_FILE_NAME;
if (!dbFileName) throw new Error('DB_FILE_NAME env var is empty');

export const db = drizzle(dbFileName, { logger: LOG_QUERIES, schema });
