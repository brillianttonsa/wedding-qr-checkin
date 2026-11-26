import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

if (!process.env.POSTGRES_URL) throw new Error('POSTGRES_URL is required');

export default defineConfig({
  schema: './src/database/schema',
  out: './src/database/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.POSTGRES_URL },
  strict: true,
  verbose: true,
});
