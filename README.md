<div align="center">
  <img src="Agentforge_logo.png" alt="AgentForge Logo" width="150"/>
  <h1>AgentForge</h1>
  <p><b>An advanced, open-source multi-agent orchestration platform.</b></p>
  <p>
    <a href="https://github.com/Finarfin12/AgentForge/stargazers"><img src="https://img.shields.io/github/stars/Finarfin12/AgentForge?style=flat-square&color=yellow" alt="Stars"></a>
    <a href="https://github.com/Finarfin12/AgentForge/network/members"><img src="https://img.shields.io/github/forks/Finarfin12/AgentForge?style=flat-square&color=blue" alt="Forks"></a>
    <a href="https://github.com/Finarfin12/AgentForge/issues"><img src="https://img.shields.io/github/issues/Finarfin12/AgentForge?style=flat-square&color=red" alt="Issues"></a>
    <a href="https://github.com/Finarfin12/AgentForge/blob/main/LICENSE"><img src="https://img.shields.io/github/license/Finarfin12/AgentForge?style=flat-square&color=green" alt="License"></a>
  </p>
</div>

<br />
<img width="1906" height="1025" alt="Screenshot 2026-06-28 215040" src="https://github.com/user-attachments/assets/389abfd2-9a50-46c2-84aa-caba36f7fa95" />

**AgentForge** is a powerful multi-agent orchestration suite designed for developers and researchers. It features a robust CLI spawn execution model, zero-config LAN agent discovery, an integrated skill marketplace, a hot-reloadable plugin system, and a peer-to-peer WebSocket agent mesh. Built for scale, collaboration, and ultimate flexibility — all entirely free and open source.

## Features

| Feature | Description |
|---------|-------------|
| **Agent Management** | Register, discover, and manage AI agents (CLI, Ollama, OpenAI-compatible) |
| **Task Orchestration** | Assign tasks to agents with squad-based collaboration |
| **Pipelines** | Build multi-step workflows with branching and templates |
| **Autopilots** | Schedule autonomous agent runs on triggers |
| **Skills** | Upload or import skills from GitHub marketplace |
| **Squads** | Group agents for coordinated task execution |
| **LAN Discovery** | Auto-discover agents on your network via mDNS/SSDP |
| **Plugin System** | Extend functionality with hot-reloadable plugins |
| **Agent Mesh** | P2P WebSocket mesh for agent-to-agent communication |
| **Reviews** | Rate and review agents with star ratings |
| **CLI Spawn** | Automatically detect and invoke CLI agents (opencode, hermes, codex, etc.) |

## Quick Install

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ and npm
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for PostgreSQL, Redis)
- Git

### One-Command Setup

**Linux / macOS:**
```bash
curl -fsSL https://raw.githubusercontent.com/Finarfin12/AgentForge/main/setup.sh | bash
```

**Windows (PowerShell):**
```powershell
irm https://raw.githubusercontent.com/Finarfin12/AgentForge/main/setup.ps1 | iex
```

### Manual Setup

```bash
# 1. Clone the repository
git clone https://github.com/Finarfin12/AgentForge.git
cd agentforge

# 2. Copy environment file
cp .env.example backend/.env

# 3. Start infrastructure (PostgreSQL, Redis, etc.)
docker compose up -d

# 4. Install backend dependencies
cd backend
npm install

# 5. Set up database tables and seed default settings
node create_settings_table.mjs
node fix_agent_skills.mjs

# 6. Build and start backend
npm run build
node dist/src/main.js &

# 7. Install and start frontend
cd ../frontend
npm install
npm run dev
```

Open **http://localhost:3000** and log in with:
- Username: `admin`
- Password: `admin123`

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  Frontend   │────▶│   Backend    │────▶│  PostgreSQL  │
│  Next.js    │     │  NestJS API  │     │  (pgvector)  │
│  :3000      │◀────│  :3002       │◀────│  :5433       │
└─────────────┘     └──────┬───────┘     └──────────────┘
                           │
                    ┌──────┴───────┐     ┌──────────────┐
                    │   CLI Agents │────▶│    Redis     │
                    │  (spawn via  │     │  (BullMQ)    │
                    │   exec())    │     │  :6379       │
                    └──────────────┘     └──────────────┘
                           │
                    ┌──────┴───────┐     ┌──────────────┐
                    │  Agent Mesh  │────▶│   Meilisearch│
                    │  (WebSocket) │     │  :7700       │
                    └──────────────┘     └──────────────┘
```

## Configuration
<img width="1915" height="1030" alt="image" src="https://github.com/user-attachments/assets/f86df629-9d59-4ef3-a85b-36dcf9bbd7ef" />

All settings are configurable via the **Settings** page in the UI or directly in `backend/.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3002 | Backend API port |
| `DATABASE_URL` | postgresql://postgres:password@localhost:5433/agentforge | PostgreSQL connection |
| `REDIS_HOST` | 127.0.0.1 | Redis host |
| `JWT_SECRET` | - | Secret for JWT tokens (change in production) |
| `GITHUB_TOKEN` | - | GitHub token for marketplace API |
| `OPENAI_API_KEY` | - | OpenAI-compatible API key |

## Plugin Development

Create a plugin by adding a directory to `backend/plugins/`:

```
plugins/
└── my-plugin/
    └── index.js
```

```javascript
module.exports = {
  manifest: {
    name: 'my-plugin',
    version: '1.0.0',
    description: 'Does something cool',
    hooks: ['onInit', 'onTask'],
  },
  onInit(api) {
    api.logger.info('My plugin loaded!');
  },
  onTask(task) {
    console.log('Task received:', task.id);
    return { intercepted: false };
  },
};
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
