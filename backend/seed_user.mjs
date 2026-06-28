import pg from 'pg';
import bcrypt from 'bcrypt';
const { Client } = pg;
const c = new Client({ connectionString: 'postgresql://postgres:password@localhost:5433/agentforge' });
await c.connect();
const hash = await bcrypt.hash('admin123', 12);
await c.query(`INSERT INTO users (id, username, email, display_name, password_hash, role)
  VALUES ('00000000-0000-0000-0000-000000000001', 'admin', 'admin@agentforge.local', 'Admin', $1, 'admin')
  ON CONFLICT (username) DO UPDATE SET password_hash = $1, role = 'admin'`, [hash]);
const r = await c.query('SELECT id, username, role FROM users WHERE username = $1', ['admin']);
console.log('User:', JSON.stringify(r.rows[0]));
await c.end();
