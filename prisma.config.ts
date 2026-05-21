import 'dotenv/config';
import { defineConfig } from 'prisma/config';

const databaseUrl = process.env.DATABASE_URL ?? process.env.DATABASE_URL_DIRECT;

export default defineConfig({
  schema: 'prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node --esm prisma/seed.ts', // ← هنا
  },
  datasource: {
    url: databaseUrl,
  },
});
