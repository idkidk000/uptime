import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './migrations',
  schema: './lib/drizzle/schema.ts',
  dialect: 'sqlite',
  dbCredentials: {
    // biome-ignore lint/style/noNonNullAssertion: FIXME
    url: process.env.DB_FILE_NAME!,
  },
});
