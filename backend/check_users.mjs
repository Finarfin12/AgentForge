import pg from 'pg';
const { Client } = pg;
const c = new Client({ connectionString: 'postgresql://postgres:password@localhost:5433/agentforge' });
await c.connect();
const r = await c.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='users'");
console.log(r.rows.map(x => `${x.column_name} (${x.data_type})`).join('\n'));
await c.end();
