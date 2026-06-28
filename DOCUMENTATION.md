# Project Orchestrator — Complete Documentation

> Version: 1.0.0 | License: MIT

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Installation & Setup](#3-installation--setup)
4. [Backend Modules](#4-backend-modules)
5. [Frontend Pages](#5-frontend-pages)
6. [Database Schema](#6-database-schema)
7. [Settings Reference](#7-settings-reference)
8. [WebSocket Events](#8-websocket-events)
9. [Plugin System](#9-plugin-system)
10. [Agent Mesh / P2P](#10-agent-mesh--p2p)
11. [Autopilot System](#11-autopilot-system)
12. [Skill System](#12-skill-system)
13. [Marketplace](#13-marketplace)
14. [API Reference](#14-api-reference)

---

## 1. Overview

Project Orchestrator is a **multi-agent orchestration platform** that enables teams to create, manage, and coordinate AI agents. It provides:

- **Agent lifecycle management** — create, invoke, monitor agents
- **Multi-agent deliberation** — threaded discussions with consensus
- **Pipeline automation** — multi-step agent workflows
- **Squad coordination** — leader-based agent teams
- **Autopilot triggers** — schedule/webhook-based autonomous runs
- **Skill system** — reusable agent capabilities
- **Plugin system** — dynamic runtime extensions
- **Agent Mesh** — P2P communication across instances
- **LAN Discovery** — mDNS/SSDP zero-config discovery
- **Marketplace** — community skill import from GitHub
- **Rating & Review** — agent feedback system

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | NestJS (TypeScript) |
| Frontend | Next.js 16 (React, Turbopack) |
| Database | PostgreSQL (via Drizzle ORM) |
| Queue | BullMQ (Redis) |
| Search | Meilisearch |
| Realtime | Socket.IO |
| Auth | JWT + bcrypt |

### Infrastructure Requirements

| Service | Default Port | Purpose |
|---------|-------------|---------|
| PostgreSQL | 5433 | Primary database |
| Redis | 6379 | Job queue + caching |
| Meilisearch | 7700 | Full-text search |
| Backend | 3002 | REST + WebSocket API |
| Frontend | 3000 | Web UI |

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                        │
│  Port 3000                                                       │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────┐  │
│  │Dashboard│ │  Agents  │ │  Tasks   │ │ Settings │ │  ...  │  │
│  └────┬────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └───┬───┘  │
│       └───────────┼────────────┼─────────────┼───────────┘      │
│                   │   REST + WebSocket (port 3002)              │
└───────────────────┼─────────────────────────────────────────────┘
                    │
┌───────────────────┼─────────────────────────────────────────────┐
│            Backend (NestJS) — Port 3002                         │
│                                                                  │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌──────────────┐  │
│  │  Auth  │ │ Agents │ │ Tasks  │ │ Skills │ │  Marketplace │  │
│  └───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘ └──────┬───────┘  │
│      └──────────┼──────────┼──────────┼──────────────┘          │
│                 │          │          │                          │
│  ┌────────┐ ┌───┴─────┐ ┌─┴──────┐ ┌─┴───────┐ ┌──────────┐   │
│  │Squads  │ │Pipelines│ │ Threads│ │Plugins  │ │Agent Mesh│   │
│  └───┬────┘ └───┬─────┘ └───┬────┘ └───┬─────┘ └────┬─────┘   │
│      └──────────┼──────────┼──────────┼──────────────┘          │
│                 │          │          │                          │
│  ┌────────┐ ┌───┴─────┐ ┌─┴──────┐ ┌─┴───────┐ ┌──────────┐   │
│  │BullMQ  │ │  Redis  │ │   DB   │ │Meilisearch││  Plugins/│   │
│  │(Queue) │ │ (Cache) │ │(PG)    │ │(Search)  │ │  *.js    │   │
│  └────────┘ └─────────┘ └────────┘ └──────────┘ └──────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

- **Dual-auth endpoints**: Most read endpoints use JWT; agent registration and heartbeat are public for headless agents
- **BullMQ for async tasks**: Task processing, pipeline execution, and autopilot dispatch are queued
- **Socket.IO namespaces**: Isolated namespaces for agents, threads, agent-messages, and mesh
- **Plugin isolation**: Plugins are loaded via `require()` from a `plugins/` directory with lifecycle hooks
- **Settings as key-value**: All settings stored in a `settings` table with JSONB values

---

## 3. Installation & Setup

### Quick Start

```bash
# Clone the repo
git clone <repo-url> project-orchestrator
cd project-orchestrator

# One-command setup (auto-installs all dependencies)
# Linux/macOS:
bash setup.sh

# Windows PowerShell:
.\setup.ps1
```

### Manual Setup

```bash
# 1. Start infrastructure
docker-compose up -d          # PostgreSQL :5433, Redis :6379, Meilisearch :7700

# 2. Backend
cd backend
cp .env.example .env          # Edit if needed
npm install
npm run build
node dist/src/main.js         # Starts on port 3002

# 3. Frontend
cd frontend
cp .env.example .env
npm install
npx next dev -p 3000          # Starts on port 3000
```

### Default Credentials

| Username | Password | Role |
|----------|----------|------|
| admin    | admin123 | admin |

### Environment Variables (.env)

#### Backend (`backend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3002` | API server port |
| `DB_HOST` | `127.0.0.1` | PostgreSQL host |
| `DB_PORT` | `5433` | PostgreSQL port |
| `DB_NAME` | `agentforge` | Database name |
| `DB_USER` | `postgres` | Database user |
| `DB_PASSWORD` | `password` | Database password |
| `REDIS_HOST` | `127.0.0.1` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `MEILI_HOST` | `http://127.0.0.1:7700` | Meilisearch host |
| `MEILI_MASTER_KEY` | `masterKey` | Meilisearch API key |
| `JWT_SECRET` | `dev-secret-change-in-production` | JWT signing secret |
| `CORS_ORIGINS` | `http://localhost:3000` | Allowed CORS origins |

#### Frontend (`frontend/.env.local`)

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3002` | Backend REST API URL |
| `NEXT_PUBLIC_WS_URL` | `http://localhost:3002` | Backend WebSocket URL |

---

## 4. Backend Modules

### 4.1 Auth Module
**Route prefix:** `/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | Public | Register new user (email, username, password) |
| POST | `/auth/login` | Public | Login (identifier=email/username, password) |
| POST | `/auth/forgot-password` | Public | Request password reset email |
| POST | `/auth/reset-password` | Public | Reset password with token |
| GET | `/auth/me` | JWT | Get current authenticated user |

### 4.2 Users Module
**Route prefix:** `/users`
**Guard:** JWT + Roles (admin for write ops)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/users` | JWT | List all users |
| GET | `/users/:id` | JWT | Get user by ID |
| PATCH | `/users/:id` | Admin | Update user (role, displayName) |
| DELETE | `/users/:id` | Admin | Delete user |

### 4.3 Agents Module
**Route prefix:** `/agents`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/agents` | JWT | List agents (filters: search, isActive) |
| GET | `/agents/:id` | JWT | Get agent detail with runtime info |
| POST | `/agents` | JWT | Create agent |
| POST | `/agents/register` | Public | Register headless agent (from CLI) |
| PATCH | `/agents/:id` | JWT | Update agent |
| DELETE | `/agents/:id` | JWT | Delete agent |
| POST | `/agents/:id/heartbeat` | Public | Agent heartbeat (keeps alive) |
| POST | `/agents/discover` | JWT | Auto-discover & register local agents |
| POST | `/agents/:id/invoke` | JWT | Sync agent invocation |
| POST | `/agents/:id/invoke/stream` | JWT | SSE-streamed agent invocation |
| WS | `/agents` namespace | — | Real-time heartbeat & status events |

### 4.4 Tasks Module
**Route prefix:** `/tasks`
**Queue:** BullMQ (`process-task`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/tasks` | JWT | List tasks (filters: status, assignedAgentId) |
| GET | `/tasks/:id` | JWT | Get task detail |
| POST | `/tasks` | JWT | Create task (enqueued) |
| PATCH | `/tasks/:id` | JWT | Update task |
| DELETE | `/tasks/:id` | JWT | Delete task |
| POST | `/tasks/:id/cancel` | JWT | Cancel running/pending task |
| POST | `/tasks/:id/retry` | JWT | Retry failed task |
| POST | `/tasks/:id/assign/:agentId` | JWT | Assign task to agent |

### 4.5 Threads Module
**Route prefix:** `/threads`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/threads` | JWT | List threads |
| GET | `/threads/:id` | JWT | Get thread with messages |
| POST | `/threads` | JWT | Create thread |
| DELETE | `/threads/:id` | JWT | Delete thread |
| GET | `/threads/:id/messages` | JWT | Get thread messages |
| POST | `/threads/:id/messages` | JWT | Add message (triggers auto-reply) |
| POST | `/threads/:id/deliberation/start` | JWT | Start multi-agent deliberation |
| GET | `/threads/:id/deliberation/status` | JWT | Get deliberation session status |

**Deliberation flow:** Problem statement → Round-robin agent responses → Vote/consensus check → Synthesis.

### 4.6 Pipelines Module
**Route prefix:** `/pipelines`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/pipelines` | JWT | List pipelines |
| GET | `/pipelines/:id` | JWT | Get pipeline detail |
| POST | `/pipelines` | JWT | Create pipeline |
| PATCH | `/pipelines/:id` | JWT | Update pipeline |
| DELETE | `/pipelines/:id` | JWT | Delete pipeline |
| GET | `/pipelines/:id/steps` | JWT | List steps |
| POST | `/pipelines/:id/steps` | JWT | Add step (agent + prompt) |
| DELETE | `/pipelines/:id/steps/:stepId` | JWT | Remove step |
| POST | `/pipelines/:id/execute` | JWT | Execute pipeline pass-through |
| GET | `/pipelines/:id/executions` | JWT | List execution history |
| GET | `/pipelines/templates/all` | JWT | List templates |
| POST | `/pipelines/:id/save-template` | JWT | Save as template |
| POST | `/pipelines/from-template/:templateId` | JWT | Create from template |

**Pipeline steps** execute sequentially — each step passes its output as input to the next step.

### 4.7 Squads Module
**Route prefix:** `/squads`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/squads` | JWT | List squads (`?scope=archived`) |
| GET | `/squads/:id` | JWT | Get squad with members |
| POST | `/squads` | JWT | Create squad with leader |
| PATCH | `/squads/:id` | JWT | Update squad |
| POST | `/squads/:id/archive` | JWT | Archive squad |
| POST | `/squads/:id/restore` | JWT | Restore archived squad |
| DELETE | `/squads/:id` | JWT | Hard delete |
| POST | `/squads/:id/members` | JWT | Add agent to squad |
| DELETE | `/squads/:id/members/:agentId` | JWT | Remove agent from squad |
| GET | `/squads/:id/members/status` | JWT | Get member online/offline statuses |

### 4.8 Autopilots Module
**Route prefix:** `/autopilots`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/autopilots` | JWT | List autopilots (filter by status) |
| GET | `/autopilots/:id` | JWT | Get autopilot with triggers & runs |
| POST | `/autopilots` | JWT | Create autopilot |
| PATCH | `/autopilots/:id` | JWT | Update autopilot |
| DELETE | `/autopilots/:id` | JWT | Delete autopilot |
| POST | `/autopilots/:id/toggle` | JWT | Toggle active/paused |
| POST | `/autopilots/:id/dispatch` | JWT | Manual dispatch (immediate run) |
| GET | `/autopilots/:id/runs` | JWT | Get run history |
| GET | `/autopilots/stats` | Public | Get aggregate stats |
| POST | `/autopilots/:id/triggers` | JWT | Add trigger (schedule/webhook) |
| PATCH | `/autopilots/triggers/:triggerId` | JWT | Update trigger |
| DELETE | `/autopilots/triggers/:triggerId` | JWT | Delete trigger |
| POST | `/autopilots/webhook/:token` | Public | Webhook endpoint |

**Used by:** `SettingsService` reads `settings.github_token` for GitHub API calls.

### 4.9 Skills Module
**Route prefix:** `/skills`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/skills` | JWT | List skills (filter by origin, agentId) |
| GET | `/skills/:id` | JWT | Get skill detail with files & assignments |
| GET | `/skills/stats` | JWT | Skill statistics |
| GET | `/skills/search` | JWT | Search skills by name/description/content |
| GET | `/skills/agent/:agentId` | JWT | Get skills assigned to specific agent |
| POST | `/skills` | JWT | Create skill |
| PATCH | `/skills/:id` | JWT | Update skill |
| DELETE | `/skills/:id` | JWT | Delete skill |
| POST | `/skills/:id/files` | JWT | Add supporting file to skill |
| DELETE | `/skills/files/:fileId` | JWT | Remove file |
| POST | `/skills/:id/assign/:agentId` | JWT | Assign skill to agent |
| DELETE | `/skills/:id/assign/:agentId` | JWT | Unassign skill from agent |

**Skill origins:** `built_in`, `custom`, `marketplace`, `local`

### 4.10 Settings Module
**Route prefix:** `/settings`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/settings` | JWT | Get all settings |
| GET | `/settings/:key` | JWT | Get single setting |
| GET | `/settings/category/:category` | JWT | Get settings by category |
| PUT | `/settings/:key` | JWT | Create or update setting |
| GET | `/settings/profile/me` | JWT | Get current user preferences |
| PUT | `/settings/profile/me` | JWT | Update user preferences |

### 4.11 Marketplace Module
**Route prefix:** `/marketplace`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/marketplace/search?q=` | JWT | Search GitHub for skill repos |
| POST | `/marketplace/import` | JWT | Import skill from GitHub repo |

**Search approach:** Searches GitHub repos with `topic:skill` + user keyword, then checks each repo for a `SKILL.md` file. Only repos with `SKILL.md` are returned.

**Used by:** `MarketplaceService` reads `settings.github_token` (if set) for authenticated API calls.

### 4.12 Plugins Module
**Route prefix:** `/plugins`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/plugins` | JWT | List all loaded plugins |
| GET | `/plugins/:name` | JWT | Get specific plugin state |
| POST | `/plugins/:name/reload` | JWT | Hot-reload plugin |
| POST | `/plugins/:name/toggle` | JWT | Enable/disable plugin |

**Plugin system:** See [Section 9 — Plugin System](#9-plugin-system).

### 4.13 Mesh Module
**Route prefix:** `/mesh`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/mesh/nodes` | JWT | List all mesh nodes |
| GET | `/mesh/nodes/:id` | JWT | Get specific node |
| POST | `/mesh/send` | JWT | Send message to node |
| POST | `/mesh/broadcast` | JWT | Broadcast to all nodes |

**Agent Mesh:** See [Section 10 — Agent Mesh / P2P](#10-agent-mesh--p2p).

### 4.14 Discovery Module
**Route prefix:** `/discovery`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/discovery` | JWT | Get previously discovered agents |
| GET | `/discovery/lan` | JWT | Get LAN peers from mDNS/SSDP |
| POST | `/discovery/scan` | JWT | Scan local machine |
| POST | `/discovery/scan/host` | Admin | Scan remote host |

**Used by:** `LanDiscoveryService` uses mDNS (via `bonjour-service`) and SSDP (UDP multicast 239.255.255.250:1900) to discover peers on the local network. Auto-publishes on server start.

### 4.15 Integrations Module
**Route prefix:** `/integrations`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/integrations/providers` | JWT | List AI providers |
| GET | `/integrations/providers/health` | JWT | Health-check all providers |
| GET | `/integrations/providers/:name/models` | JWT | List models for provider |

**Supported providers:** Ollama, OpenAI-compatible, CLI-based.

### 4.16 Runtimes Module
**Route prefix:** `/runtimes`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/runtimes` | JWT | List registered runtimes |
| GET | `/runtimes/:id` | JWT | Get runtime detail |
| GET | `/runtimes/detect` | Public | Auto-detect CLI tools |
| GET | `/runtimes/stats` | Public | Runtime statistics |
| POST | `/runtimes/register` | Public | Register runtime |
| POST | `/runtimes/:id/heartbeat` | Public | Runtime heartbeat |
| DELETE | `/runtimes/:id` | JWT | Delete runtime |

### 4.17 Agent Messages Module
**Route prefix:** `/agent-messages`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/agent-messages/inbox?agentId=` | JWT | Get inbox |
| GET | `/agent-messages/sent?agentId=` | JWT | Get sent messages |
| GET | `/agent-messages/thread/:threadId` | JWT | Get conversation thread |
| GET | `/agent-messages/unread-count?agentId=` | JWT | Unread count |
| GET | `/agent-messages/:id` | JWT | Get single message |
| POST | `/agent-messages/send` | JWT | Send (triggers auto-reply) |
| POST | `/agent-messages/:id/reply` | JWT | Reply to message |
| PATCH | `/agent-messages/:id/read` | JWT | Mark as read |
| PATCH | `/agent-messages/:id/archive` | JWT | Archive message |

### 4.18 Reviews Module
**Route prefix:** `/reviews`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/reviews/agent/:agentId` | Public | List reviews for agent |
| GET | `/reviews/agent/:agentId/stats` | Public | Get avg rating + count |
| POST | `/reviews` | JWT | Create review (1 per user per agent) |
| PATCH | `/reviews/:id` | JWT | Update own review |
| DELETE | `/reviews/:id` | JWT | Delete own review |

### 4.19 Knowledge Module
**Route prefix:** `/knowledge`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/knowledge` | JWT | List memories (filter: agentId) |
| GET | `/knowledge/:id` | JWT | Get memory detail |
| GET | `/knowledge/search` | JWT | Search memories |
| GET | `/knowledge/stats` | JWT | Total memory count |
| POST | `/knowledge` | JWT | Create memory |
| PATCH | `/knowledge/:id` | JWT | Update memory |
| DELETE | `/knowledge/:id` | JWT | Delete memory |

### 4.20 Search Module
**Route prefix:** `/search`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/search?q=` | JWT | Global search across agents, tasks, threads, pipelines |

### 4.21 Logs Module
**Route prefix:** `/logs`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/logs` | JWT | Paginated logs (page, limit, level, search) |
| GET | `/logs/:id` | JWT | Log detail |
| POST | `/logs` | JWT | Create log entry |
| PATCH | `/logs/:id` | JWT | Update log |
| DELETE | `/logs/:id` | JWT | Delete log |

---

## 5. Frontend Pages

### 5.1 Public Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Landing | Landing page |
| `/login` | Login | Authentication |
| `/register` | Register | New user signup |
| `/forgot-password` | Forgot Password | Password reset request |

### 5.2 Workspace Pages (authenticated)

| Route | Page | Description |
|-------|------|-------------|
| `/dashboard` | Dashboard | Overview with stats, recent activity, quick actions |
| `/agents` | Agents | Agent list, status, metrics |
| `/agents/[id]` | Agent Detail | Agent config, stats, skills, reviews |
| `/tasks` | Tasks | Task list with status/priority filters |
| `/tasks/[id]` | Task Detail | Task info, output, retry/cancel actions |
| `/pipelines` | Pipelines | Pipeline list + step editor |
| `/pipelines/[id]` | Pipeline Detail | Execution history, run button |
| `/squads` | Squads | Squad list + member management |
| `/squads/[id]` | Squad Detail | Squad members, statuses, actions |
| `/autopilots` | Autopilots | Autopilot list + schedule/webhook triggers |
| `/skills` | Skills | Skill list, creation, assignment |
| `/mesh` | Agent Mesh | Mesh node list, live message log |
| `/threads` | Threads | Thread list |
| `/agent-messages` | Inbox | Agent-to-agent messages inbox |
| `/agent-messages/sent` | Sent | Sent messages |
| `/agent-messages/compose` | Compose | New message form |

### 5.3 Discovery Pages

| Route | Page | Description |
|-------|------|-------------|
| `/search` | Global Search | Cross-entity search |
| `/discovery` | Network Scan | LAN peers, mDNS/SSDP results |
| `/integrations` | Integrations | AI provider list + health |
| `/runtimes` | Runtimes | Registered runtimes + detection |
| `/marketplace` | Marketplace | GitHub skill search + import |
| `/plugins` | Plugins | Plugin list, toggle, reload |

### 5.4 Monitor Pages

| Route | Page | Description |
|-------|------|-------------|
| `/notifications` | Notifications | System notifications |
| `/logs` | Logs | System log viewer with filters |
| `/reviews` | Reviews | Agent ratings and reviews |

### 5.5 Configure Pages

| Route | Page | Description |
|-------|------|-------------|
| `/settings` | Settings | Global settings (8 categories) |
| `/users` | Users | User management (admin) |
| `/audit` | Audit | Audit trail |

---

## 6. Database Schema

### 6.1 Core Tables (18 tables)

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `users` | User accounts | id, email, username, password_hash, role, preferences (jsonb) |
| `agents` | Agent instances | id, name, status, capabilities (jsonb), config (jsonb), runtime_id |
| `agent_runtimes` | Runtime registrations | id, name, provider, status, mode, metadata (jsonb) |
| `agent_reviews` | Agent ratings (1-5) | id, agent_id, user_id, rating, UNIQUE(agent_id, user_id) |
| `agent_messages` | Agent-to-agent messages | id, from_agent_id, to_agent_id, type, status, priority |
| `agent_memories` | RAG vector store | id, agent_id, content, embedding (vector(1536)) |
| `skills` | Agent skills | id, name, content, config (jsonb), origin |
| `skill_files` | Skill supporting files | id, skill_id, path, content |
| `agent_skills` | Agent ↔ Skill junction | agent_id, skill_id (composite PK + cascade) |
| `tasks` | Task queue | id, title, status, priority, assigned_agent_id, input/output (jsonb) |
| `threads` | Conversation threads | id, title, status, participant_agent_ids (uuid[]), consensus |
| `thread_messages` | Thread messages | id, thread_id, role, content, vote_data, deliberation data |
| `deliberation_sessions` | Multi-agent deliberation | id, thread_id, status, current_round, max_rounds, consensus_threshold |
| `deliberation_rounds` | Deliberation rounds | id, session_id, round_number, status |
| `pipelines` | Execution pipelines | id, name, config (jsonb), status, is_template |
| `pipeline_steps` | Pipeline steps | id, pipeline_id, step_order, agent_id, config (jsonb), input_mapping |
| `pipeline_executions` | Pipeline execution history | id, pipeline_id, status, input/output (jsonb), duration_ms |
| `squads` | Agent squads | id, name, leader_id, instructions, archived_at |
| `squad_members` | Squad ↔ Agent membership | id, squad_id, agent_id, role, UNIQUE(squad_id, agent_id) |
| `autopilots` | Autonomous agents | id, name, status, assignee_type/id, execution_mode |
| `autopilot_triggers` | Autopilot triggers | id, autopilot_id, kind (schedule/webhook), cron_expression, webhook_token |
| `autopilot_runs` | Autopilot execution history | id, autopilot_id, trigger_id, source, status, result |
| `system_logs` | System audit log | id, level, source, message, details (jsonb) |
| `audit_log` | User action audit | id, user_id, action, resource_type, old/new_value (jsonb) |
| `settings` | Key-value settings | key (PK), value (jsonb), category, description |

---

## 7. Settings Reference

All settings are stored in the `settings` table. Accessible via `GET/PUT /settings/:key`.

| Key | Category | Type | Default | Used By | Description |
|-----|----------|------|---------|---------|-------------|
| `instance_name` | general | string | `"AgentForge"` | Display name in UI | Display name of this orchestrator instance |
| `timezone` | general | string | `"UTC"` | AutopilotsService.checkDueSchedules() | Server timezone for schedule trigger evaluation. Used as fallback when trigger has no timezone set. |
| `language` | general | string | `"en"` | Sidebar i18n system | Default UI language. Sidebar loads this on mount and applies translations (en/id). |
| `open_registration` | security | boolean | `true` | `AuthService.register()` | Allow anyone to create an account |
| `rate_limit_per_minute` | security | number | `60` | `ThrottlerGuard` (app.module) | Max API requests per minute per IP |
| `github_token` | api_keys | string | `""` | `MarketplaceService.search()` | GitHub personal access token for marketplace API calls. Without this, rate-limited to 60 req/hr. |
| `agent_timeout_ms` | agent_defaults | number | `120000` | `AgentsService.invoke()` | Default timeout for agent invocations |
| `default_temperature` | agent_defaults | number | `0.7` | `AgentsService.invoke()` (fallback) | Default LLM temperature for new agents |
| `default_max_tokens` | agent_defaults | number | `2048` | `AgentsService.invoke()` (fallback) | Default max output tokens for agents |
| `discovery_mdns` | discovery | boolean | `true` | `LanDiscoveryService` | Enable mDNS service advertisement + browsing |
| `discovery_ssdp` | discovery | boolean | `true` | `LanDiscoveryService` | Enable SSDP multicast discovery |
| `discovery_scan_interval` | discovery | number | `30000` | `LanDiscoveryService` | LAN scan interval in milliseconds |
| `log_level` | logging | string | `"info"` | `LogsService` | Minimum log level to record (debug/info/warn/error/fatal) |
| `log_retention_days` | logging | number | `30` | Log cleanup cron | Days to retain log entries before auto-purge |
| `proxy_url` | proxy | string | `""` | `MarketplaceService.search()` | HTTP proxy URL for outbound requests. Used when backend is behind a corporate firewall. |
| `notify_task_completed` | notifications | boolean | `true` | `TasksProcessor` (on complete) | Send notification when task completes |
| `notify_agent_offline` | notifications | boolean | `true` | `AgentsService` (heartbeat miss) | Send notification when agent misses heartbeat |
| `notify_autopilot_run` | notifications | boolean | `false` | `AutopilotsService.dispatch()` | Send notification on autopilot run |

### User Preferences (stored in `users.preferences` jsonb)

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `displayName` | string | `""` | Display name shown in UI |
| `theme` | string | `"dark"` | UI theme (dark/light/system) |

---

## 8. WebSocket Events

### 8.1 `/agents` Namespace

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `agent:heartbeat` | Client → Server | `{ agentId, status }` | Agent keeps connection alive |
| `agent:status` | Bidirectional | `{ agentId, status, ... }` | Status change notification |
| `agent:updated` | Server → Client | `{ agentId, changes }` | Agent config/state updated |

### 8.2 `/threads` Namespace

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `deliberation:progress` | Server → Client | `{ sessionId, round, message }` | Deliberation round update |

### 8.3 `/mesh` Namespace

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `mesh:register` | Client → Server | `{ nodeId, name, metadata }` | Register as mesh node |
| `mesh:message` | Bidirectional | `{ from, to, type, payload }` | P2P message |
| `mesh:ping` | Client → Server | `{ nodeId }` | Health check |
| `mesh:pong` | Server → Client | `{ nodeId, timestamp }` | Health response |
| `mesh:signal` | Bidirectional | `{ from, to, type, sdp/ice }` | WebRTC signaling |
| `mesh:get-nodes` | Client → Server | — | Request node list |
| `mesh:node-list` | Server → Client | `{ nodes }` | Current node list |

### 8.4 `/agent-messages` Namespace

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `agent-message:new` | Server → Client | `{ message }` | New incoming message |

---

## 9. Plugin System

### 9.1 Directory Structure

All plugins live in `backend/plugins/`. Each plugin is a single `.js` file:

```
backend/plugins/
  example.plugin.js
  my-custom.plugin.js
```

### 9.2 Plugin Interface

```javascript
module.exports = {
  name: 'my-plugin',
  version: '1.0.0',
  description: 'Does something useful',

  // Lifecycle hooks
  onInit() { /* called when plugin is loaded */ },
  onDestroy() { /* called when plugin is unloaded */ },

  // Event hooks
  onTask(task) { /* called before task processing */ },
  onAgentMessage(msg) { /* called on agent message */ },
  onAutopilotTrigger(trigger) { /* called on autopilot trigger */ },

  // Optional: add REST routes
  routes(router) {
    router.get('/my-plugin/hello', (req, res) => {
      res.json({ message: 'Hello from plugin!' });
    });
  },
};
```

### 9.3 Lifecycle

1. **Load**: Server scans `plugins/` directory on startup, calls `onInit()` on each
2. **Reload**: `POST /plugins/:name/reload` — calls `onDestroy()`, re-requires, calls `onInit()`
3. **Toggle**: `POST /plugins/:name/toggle` with `{ enabled: true/false }` — skips hook invocations when disabled
4. **Unload**: Server calls `onDestroy()` on shutdown

---

## 10. Agent Mesh / P2P

### 10.1 Architecture

The Mesh module enables peer-to-peer communication between multiple Project Orchestrator instances:

```
┌──────────────────┐         ┌──────────────────┐
│  Instance A      │         │  Instance B      │
│  Port 3002       │◄───────►│  Port 3002       │
│  ┌────────────┐  │  Socket │  ┌────────────┐  │
│  │ MeshService │  │   IO    │  │ MeshService │  │
│  └────────────┘  │  Mesh   │  └────────────┘  │
└──────────────────┘         └──────────────────┘
```

### 10.2 REST API

- `GET /mesh/nodes` — list all connected nodes
- `POST /mesh/send` — `{ to: "nodeId", type: "msg", payload: {} }`
- `POST /mesh/broadcast` — `{ type: "msg", payload: {} }`

### 10.3 WebSocket

Connect to `ws://localhost:3002/mesh` with query param `?nodeId=xxx&name=yyy`.

---

## 11. Autopilot System

### 11.1 Overview

Autopilots are autonomous agents that monitor triggers and dispatch work automatically.

### 11.2 Trigger Types

| Kind | Behavior |
|------|----------|
| **schedule** | CRON expression (`0 */6 * * *`). Evaluated every 60s by `checkDueSchedules()`. |
| **webhook** | External POST to `/autopilots/webhook/:token`. Token is auto-generated. |

### 11.3 Execution Modes

| Mode | Behavior |
|------|----------|
| `create_task` | Creates a task and assigns it to the target agent. Autopilot title used as task title. |
| `dispatch_agent` | Directly invokes the target agent with the trigger payload. |

### 11.4 Autopilot Run Flow

Trigger fires → `dispatch()` creates `autopilot_run` record → creates task → agent processes task → run marked completed/failed.

---

## 12. Skill System

### 12.1 Skill Structure

A skill is a reusable capability that can be attached to agents:

```json
{
  "id": "uuid",
  "name": "web-search",
  "description": "Search the web via Google",
  "content": "Markdown instructions for the agent...",
  "config": { "api_key_env": "GOOGLE_API_KEY" },
  "origin": "marketplace",
  "files": [
    { "path": "search.py", "content": "..." }
  ]
}
```

### 12.2 Skill Origins

| Origin | Description |
|--------|-------------|
| `built_in` | Shipped with the platform |
| `custom` | User-created via UI or API |
| `marketplace` | Imported from GitHub marketplace |
| `local` | Created by local CLI tools |

### 12.3 Assignment

Skills are assigned to agents via the junction table `agent_skills`. Multiple skills can be assigned to a single agent.

---

## 13. Marketplace

The Marketplace module searches GitHub for repos tagged with the `skill` topic.

### 13.1 Search

```
GET /marketplace/search?q=web&page=1
```

1. Searches GitHub repos with `topic:skill ${query}`
2. For each result, checks if `SKILL.md` exists (parallel HEAD requests)
3. Returns only repos that have `SKILL.md`, sorted by GitHub stars
4. Without `github_token` setting, rate-limited to 60 requests/hour

### 13.2 Import

```
POST /marketplace/import
Body: { "repo": "owner/repo-name" }
```

1. Fetches `SKILL.md` from the repo
2. Creates a new skill with content from SKILL.md
3. Origin set to `marketplace`

---

## 14. API Reference

### 14.1 Authentication

All JWT-protected endpoints require:

```
Authorization: Bearer <token>
```

Login returns `{ user, token }`. Token is a JWT with 7-day expiry.

### 14.2 Error Response Format

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

### 14.3 Pagination

Where supported (e.g., `/logs`), query params:

| Param | Type | Default |
|-------|------|---------|
| `page` | number | 1 |
| `limit` | number | 50 |

Response includes `{ data[], total, page, limit, totalPages }`.

### 14.4 Rate Limiting

Default: **60 requests per minute** per IP. Configurable via `rate_limit_per_minute` setting.

### 14.5 WebSocket Connection

```javascript
const socket = io('http://localhost:3002/mesh', {
  query: { nodeId, name },
  transports: ['websocket'],
});
```
