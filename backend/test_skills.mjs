import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './dist/src/database/schema.js';

const pool = new pg.Pool({ connectionString: 'postgresql://postgres:password@localhost:5433/agentforge' });
const db = drizzle(pool, { schema });

try {
  const q = db.select().from(schema.skills).orderBy(schema.skills.createdAt);
  console.log('Query type:', typeof q, q?.constructor?.name);
  console.log('Has then:', typeof q?.then);
  const result = await q;
  console.log('Result:', JSON.stringify(result).substring(0, 200));
} catch(e) {
  console.log('Error:', e.message);
}
await pool.end();
