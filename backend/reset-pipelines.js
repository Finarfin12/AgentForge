require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:admin@localhost:5432/agentforge' });

async function reset() {
  await pool.query("UPDATE pipelines SET status = 'failed' WHERE status = 'running'");
  await pool.query("UPDATE pipeline_steps SET status = 'failed' WHERE status = 'running'");
  await pool.query("UPDATE pipeline_executions SET status = 'failed' WHERE status = 'running'");
  console.log('Reset stuck pipelines!');
  process.exit(0);
}
reset();
