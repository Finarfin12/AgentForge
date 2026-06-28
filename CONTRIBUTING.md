# Contributing

## Development Setup

```bash
git clone https://github.com/your-org/agentforge.git
cd agentforge
cp .env.example backend/.env
docker compose up -d
cd backend && npm install && npm run build
cd ../frontend && npm install
```

## Project Structure

```
agentforge/
├── backend/          # NestJS API (:3002)
│   ├── src/
│   │   ├── agents/       # Agent CRUD + CLI discovery
│   │   ├── auth/         # JWT auth, register, login
│   │   ├── database/     # Drizzle schema + DB service
│   │   ├── discovery/    # Port scan + mDNS/SSDP
│   │   ├── integrations/ # AI provider adapters
│   │   ├── logs/         # System + audit logging
│   │   ├── marketplace/  # GitHub skill search/import
│   │   ├── mesh/         # WebSocket P2P gateway
│   │   ├── plugins/      # Dynamic plugin loader
│   │   ├── reviews/      # Agent rating/review
│   │   ├── settings/     # Global config + user prefs
│   │   ├── skills/       # Skill CRUD + assignment
│   │   └── ...
│   └── plugins/       # Hot-reloadable plugins
├── frontend/         # Next.js app (:3000)
│   └── src/
│       ├── app/         # App Router pages
│       └── components/  # Shared UI components
├── docker-compose.yml  # PostgreSQL, Redis, etc.
└── setup.sh / setup.ps1  # One-command installers
```

## Coding Standards

- TypeScript strict mode
- No comments in code — let types and naming speak
- One component per file (frontend)
- Services are stateless (backend)
- Use existing drizzle patterns for DB queries

## Pull Request Process

1. Create a feature branch from `main`
2. Run `npm run build` in both backend and frontend
3. Ensure all API endpoints return 200
4. Open a PR with a clear description of what changed and why

## Adding a Plugin

See [README.md#plugin-development](README.md#plugin-development).

## License

MIT
