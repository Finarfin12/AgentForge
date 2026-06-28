import pg from 'pg';
const { Client } = pg;
const c = new Client({ connectionString: 'postgresql://postgres:password@localhost:5433/agentforge' });
await c.connect();
await c.query(`
  CREATE TABLE IF NOT EXISTS settings (
    key varchar(100) PRIMARY KEY,
    value jsonb NOT NULL DEFAULT '{}'::jsonb,
    category varchar(50) NOT NULL DEFAULT 'general',
    description text DEFAULT '',
    updated_at timestamp with time zone DEFAULT now()
  )
`);
// Seed default settings
const defaults = [
  ['instance_name', JSON.stringify('AgentForge'), 'general', 'Display name of this orchestrator instance. Used in: UI header, system notifications.'],
  ['timezone', JSON.stringify('UTC'), 'general', 'Server timezone for schedule trigger evaluation. Used in: AutopilotsService.checkDueSchedules() as fallback when trigger has no timezone set. Default: UTC.'],
  ['language', JSON.stringify('en'), 'general', 'Default UI language. Sidebar loads this on mount and applies translations via i18n system. Values: en, id.'],
  ['open_registration', JSON.stringify(true), 'security', 'Allow anyone to create an account via /auth/register. Used in: AuthService.register().'],
  ['rate_limit_per_minute', JSON.stringify(60), 'security', 'Max API requests per minute per IP address. Used in: ThrottlerGuard (app.module.ts).'],
  ['github_token', JSON.stringify(''), 'api_keys', 'GitHub personal access token for marketplace API calls. Without this, rate-limited to 60 req/hr. Used in: MarketplaceService.search().'],
  ['agent_timeout_ms', JSON.stringify(120000), 'agent_defaults', 'Default timeout in ms for agent invocations. Used in: AgentsService.invoke() as fallback.'],
  ['default_temperature', JSON.stringify(0.7), 'agent_defaults', 'Default LLM temperature for new agents (0.0-1.0). Used in: AgentsService.invoke() as fallback.'],
  ['default_max_tokens', JSON.stringify(2048), 'agent_defaults', 'Default max output tokens for agent responses. Used in: AgentsService.invoke() as fallback.'],
  ['discovery_mdns', JSON.stringify(true), 'discovery', 'Enable mDNS (Bonjour) service advertisement and LAN browsing. Used in: LanDiscoveryService.'],
  ['discovery_ssdp', JSON.stringify(true), 'discovery', 'Enable SSDP UDP multicast discovery on 239.255.255.250:1900. Used in: LanDiscoveryService.'],
  ['discovery_scan_interval', JSON.stringify(30000), 'discovery', 'Interval in ms between LAN discovery scans. Used in: LanDiscoveryService. Default: 30000 (30s).'],
  ['log_level', JSON.stringify('info'), 'logging', 'Minimum log level to record. Values: debug, info, warn, error, fatal. Used in: LogsService.'],
  ['log_retention_days', JSON.stringify(30), 'logging', 'Days to retain log entries before auto-purge. Used in: log cleanup cron job.'],
  ['proxy_url', JSON.stringify(''), 'proxy', 'HTTP proxy URL for outbound requests (e.g., behind corporate firewall). Used in: MarketplaceService.search() for GitHub fetches.'],
  ['notify_task_completed', JSON.stringify(true), 'notifications', 'Send notification when a task completes. Used in: TasksProcessor (on task completion).'],
  ['notify_agent_offline', JSON.stringify(true), 'notifications', 'Send notification when an agent misses its heartbeat. Used in: AgentsService heartbeat check.'],
  ['notify_autopilot_run', JSON.stringify(false), 'notifications', 'Send notification when an autopilot executes a run. Used in: AutopilotsService.dispatch().'],
];
for (const [key, value, category, description] of defaults) {
  await c.query(`INSERT INTO settings (key, value, category, description) VALUES ($1, $2::jsonb, $3, $4) ON CONFLICT (key) DO UPDATE SET category=$3, description=$4`, [key, value, category, description]);
}
const count = await c.query('SELECT COUNT(*) FROM settings');
console.log(`Settings table ready with ${count.rows[0].count} entries`);
await c.end();
