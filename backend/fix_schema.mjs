import pg from 'pg';
const { Client } = pg;
const c = new Client({ connectionString: 'postgresql://postgres:password@localhost:5433/agentforge' });
await c.connect();
await c.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token varchar(255)');
await c.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry timestamp with time zone');
await c.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences jsonb DEFAULT '{}'::jsonb");
console.log('Columns added');
await c.end();
