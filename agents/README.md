# AgentForge Heartbeat Client

Standalone client that keeps your local AI agent registered and alive in the AgentForge orchestration system.

## Features

- **WebSocket heartbeats** — Real-time connection, no auth required
- **Auto-registration** — Automatically registers your agent with the backend
- **REST fallback** — Falls back to REST API if WebSocket fails
- **Auto-reconnect** — Handles network interruptions gracefully
- **Configurable** — All settings via environment variables

## Quick Start

```bash
# Install dependencies
npm install

# Configure
cp .env.example .env
# Edit .env with your settings

# Run
npm start
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKEND_WS_URL` | `http://localhost:3001` | Backend WebSocket URL |
| `BACKEND_API_URL` | `http://localhost:3001` | Backend REST API URL |
| `AGENT_TOKEN` | (empty) | JWT token for REST API (optional) |
| `AGENT_NAME` | `local_agent` | Unique agent name/slug |
| `AGENT_DISPLAY_NAME` | `Local Agent` | Display name shown in UI |
| `AGENT_DESCRIPTION` | `Auto-registered local AI agent` | Agent description |
| `AGENT_PROVIDER` | `ollama` | AI provider type |
| `AGENT_MODEL` | `default` | Model name |
| `AGENT_PORT` | `11434` | Local AI server port |
| `HEARTBEAT_INTERVAL_MS` | `30000` | Heartbeat interval (30s) |
| `RECONNECT_DELAY_MS` | `5000` | Reconnect delay (5s) |
| `MAX_RECONNECT_ATTEMPTS` | `0` | Max retries (0 = infinite) |

## How It Works

```
1. Client starts
   ↓
2. Check if agent exists in backend
   ↓ (if not)
3. Auto-register agent
   ↓
4. Connect via WebSocket
   ↓
5. Send heartbeat every 30s
   ↓
6. Backend marks agent "idle"
   ↓
7. Heartbeat monitor keeps agent alive
```

## Running as a Service

### Using PM2 (recommended)

```bash
npm install -g pm2
pm2 start dist/heartbeat-client.js --name "agentforge-heartbeat"
pm2 save
pm2 startup
```

### Using systemd (Linux)

```bash
# Create service file
sudo tee /etc/systemd/system/agentforge-heartbeat.service <<EOF
[Unit]
Description=AgentForge Heartbeat Client
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
ExecStart=$(which node) dist/heartbeat-client.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable agentforge-heartbeat
sudo systemctl start agentforge-heartbeat
```

## Development

```bash
# Run with tsx (no compile needed)
npm run dev

# Build TypeScript
npm run build
```

## Troubleshooting

### "Failed to register agent"
- Ensure AgentForge backend is running on port 3001
- Check `BACKEND_API_URL` in `.env`

### "WebSocket disconnected"
- Normal during network issues — client will auto-reconnect
- Check backend logs for connection errors

### Agent shows "offline" in dashboard
- Heartbeat client might not be running
- Check `HEARTBEAT_INTERVAL_MS` — too high may cause timeout
