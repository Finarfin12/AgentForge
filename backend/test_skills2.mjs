import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, desc, and } from 'drizzle-orm';
import * as schema from './dist/src/database/schema.js';

const pool = new pg.Pool({ connectionString: 'postgresql://postgres:password@localhost:5433/agentforge' });
const db = drizzle(pool, { schema });

async function findAll(origin, agentId) {
  let q = db.select({
    id: schema.skills.id,
    name: schema.skills.name,
    description: schema.skills.description,
    origin: schema.skills.origin,
    createdAt: schema.skills.createdAt,
    updatedAt: schema.skills.updatedAt,
  }).from(schema.skills).orderBy(desc(schema.skills.createdAt));

  const conditions = [];
  if (origin) conditions.push(eq(schema.skills.origin, origin));
  if (agentId) {
    q = db.select({
      id: schema.skills.id,
      name: schema.skills.name,
    }).from(schema.skills)
      .innerJoin(schema.agentSkills, eq(schema.agentSkills.skillId, schema.skills.id))
      .where(eq(schema.agentSkills.agentId, agentId))
      .orderBy(desc(schema.skills.createdAt));
  } else if (conditions.length > 0) {
    q.where(and(...conditions));
  }
  return q;
}

try {
  const result = await findAll(null, null);
  console.log('Result type:', typeof result, Array.isArray(result), result?.length);
  console.log('First:', JSON.stringify(result[0])?.substring(0, 200));
} catch(e) {
  console.log('Error:', e.message);
  console.log(e.stack?.substring(0, 300));
}
await pool.end();
