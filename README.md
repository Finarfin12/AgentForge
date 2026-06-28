<div align="center">
  <img src="Agentforge_logo.png" alt="AgentForge Logo" width="150"/>
  <h1>AgentForge</h1>
  <p><b>An advanced, open-source multi-agent orchestration platform.</b></p>
  <p>
    <a href="https://github.com/Finarfin12/AgentForge/stargazers"><img src="https://img.shields.io/github/stars/Finarfin12/AgentForge?style=flat-square&color=yellow" alt="Stars"></a>
    <a href="https://github.com/Finarfin12/AgentForge/network/members"><img src="https://img.shields.io/github/forks/Finarfin12/AgentForge?style=flat-square&color=blue" alt="Forks"></a>
    <a href="https://github.com/Finarfin12/AgentForge/issues"><img src="https://img.shields.io/github/issues/Finarfin12/AgentForge?style=flat-square&color=red" alt="Issues"></a>
    <a href="https://github.com/Finarfin12/AgentForge/blob/main/LICENSE"><img src="https://img.shields.io/github/license/Finarfin12/AgentForge?style=flat-square&color=green" alt="License"></a>
    <a href="https://github.com/Finarfin12/AgentForge"><img src="https://img.shields.io/badge/TypeScript-100%25-blue?style=flat-square" alt="TypeScript"></a>
  </p>
</div>

<br />
<img width="1906" height="1025" alt="Screenshot 2026-06-28 215040" src="https://github.com/user-attachments/assets/389abfd2-9a50-46c2-84aa-caba36f7fa95" />

**AgentForge** is a powerful multi-agent orchestration suite designed for developers and researchers. It features a robust CLI spawn execution model, zero-config LAN agent discovery, an integrated skill marketplace, a hot-reloadable plugin system, and a peer-to-peer WebSocket agent mesh.

Built for **AI/LLM developers** who need enterprise-grade agent coordination without the complexity.

---

## 🎯 For AI Developers

AgentForge simplifies building sophisticated AI systems:

- **Multi-Agent Collaboration** — Orchestrate LLMs (OpenAI, Ollama, local models) working together
- **Zero Setup** — Auto-discover agents on your LAN, no configuration needed
- **Skills Marketplace** — Share and reuse pre-built agent capabilities
- **Hot Reload Plugins** — Extend functionality without restarting
- **P2P Agent Mesh** — Direct agent-to-agent communication via WebSocket
- **LLM Agnostic** — Works with any LLM (OpenAI, Ollama, local models, etc.)

### 💡 Common Use Cases

- **AI Research** — Run experiments with multiple LLM configurations
- **Autonomous Workflows** — Chain agents for complex multi-step tasks
- **LLM Benchmarking** — Compare agent performance across models
- **Distributed AI** — Coordinate agents across multiple machines
- **Custom Skill Development** — Build and share domain-specific AI capabilities

---

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

---

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

---

## 🚀 Getting Started with Your First Multi-Agent Task

### Step 1: Register Your LLM Agent

```bash
# Option A: Use Ollama (local LLM)
cd agents
npm install
AGENT_PROVIDER=ollama AGENT_MODEL=mistral npm start

# Option B: Use OpenAI
AGENT_PROVIDER=openai OPENAI_API_KEY=sk-xxx npm start
```

### Step 2: Create a Squad

In the AgentForge UI:
1. Go to **Squads**
2. Create a new squad
3. Add your registered agents

### Step 3: Run a Task

```bash
# Use the REST API or UI to submit a task
curl -X POST http://localhost:3002/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "squad_id": "your-squad-id",
    "prompt": "Analyze this code and suggest improvements",
    "context": "..."
  }'
```

👉 **[Full AI Developer Guide](docs/ai-developer-guide.md)**

---

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

---

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

---

## 📚 Documentation

- **[AI Developer Guide](docs/ai-developer-guide.md)** — Everything you need to build AI systems with AgentForge
- **[Examples](docs/examples/)** — Real-world examples and code snippets
- **[GitHub Topics Guide](.github/TOPICS.md)** — How to maximize repo discoverability

### Examples

- [Example 1: Basic Code Review](docs/examples/01-basic-code-review.md) — Single agent task
- [Example 2: Multi-Agent Review](docs/examples/02-multi-agent-review.md) — Multiple specialized agents
- [Example 3: Automated Pipeline](docs/examples/03-pipeline-example.md) — GitHub integration & automation

---

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

---

## 🤝 Contributing

We welcome contributions from the AI developer community! Whether it's:

- 🛠️ **New features** for agent orchestration
- 🎯 **New skills** to share with other developers
- 📖 **Documentation** improvements
- 🐛 **Bug fixes** and optimizations
- 💡 **Ideas** for improving the platform

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## 📄 License

MIT

---

## 🌟 Acknowledgments

Built with:
- **NestJS** — Scalable Node.js backend
- **Next.js** — Modern React frontend
- **PostgreSQL + pgvector** — Scalable vector storage
- **Redis + BullMQ** — Task queue and message broker
- **WebSocket** — Real-time agent communication

---

## 📞 Support & Community

- 💬 **Issues** — Found a bug? [Open an issue](https://github.com/Finarfin12/AgentForge/issues)
- 💡 **Discussions** — Have an idea? [Start a discussion](https://github.com/Finarfin12/AgentForge/discussions)
- ⭐ **Star us** — Show your support!

---

**AgentForge: Orchestrate Your AI Agents with Confidence** 🚀
