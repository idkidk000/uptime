import 'dotenv/config';
import { env } from 'node:process';
import { defineConfig } from 'drizzle-kit';

const url = env.DB_FILE_NAME;

if (typeof url === 'undefined') throw new Error('DB_FILE_NAME env var is undefined');

export default defineConfig({
  out: './migrations',
  schema: './lib/drizzle/schema.ts',
  dialect: 'sqlite',
  dbCredentials: { url },
});
