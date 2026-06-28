import pg from 'pg';
const { Client } = pg;
const c = new Client({ connectionString: 'postgresql://postgres:password@localhost:5433/agentforge' });
await c.connect();
const r = await c.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND (table_name LIKE '%setting%' OR table_name LIKE '%config%' OR table_name LIKE '%preference%')");
console.log(r.rows.length ? r.rows.map(x => x.table_name).join(', ') : 'none');
await c.end();
