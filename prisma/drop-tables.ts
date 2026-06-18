import { config } from 'dotenv';
config();

import pg from 'pg';

const databaseUrl = process.env.DATABASE_URL ?? process.env.DATABASE_URL_DIRECT;
const shouldRun = process.argv.includes('--yes');

if (!databaseUrl) {
  throw new Error('Missing DATABASE_URL or DATABASE_URL_DIRECT in .env');
}

if (!shouldRun) {
  throw new Error(
    'This script drops all tables in the public schema. Run with --yes to confirm.',
  );
}

const pool = new pg.Pool({
  connectionString: databaseUrl,
  connectionTimeoutMillis: 60000,
  query_timeout: 60000,
  max: 1,
});

function quoteIdentifier(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

async function main() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { rows } = await client.query<{ tablename: string }>(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    if (rows.length === 0) {
      console.log('No tables found in public schema.');
      await client.query('COMMIT');
      return;
    }

    const tables = rows.map((row) => quoteIdentifier(row.tablename)).join(', ');
    await client.query(`DROP TABLE ${tables} CASCADE`);
    await client.query('COMMIT');

    console.log(`Dropped ${rows.length} table(s):`);
    rows.forEach((row) => console.log(`- ${row.tablename}`));
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
