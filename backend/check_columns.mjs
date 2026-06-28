import pg from 'pg';
const { Client } = pg;
const c = new Client({ connectionString: 'postgresql://postgres:password@localhost:5433/agentforge' });
await c.connect();
for (const table of ['skill_files', 'agent_skills', 'skills']) {
  const r = await c.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name=$1", [table]);
  console.log(`\n${table}:`);
  r.rows.forEach(x => console.log(`  ${x.column_name} (${x.data_type})`));
}
await c.end();
