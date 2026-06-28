#!/usr/bin/env node

/**
 * AgentForge Heartbeat Client
 * 
 * Standalone script that keeps your local AI agent registered and alive
 * in the AgentForge orchestration system.
 * 
 * Features:
 * - WebSocket-based heartbeats (no auth required)
 * - Auto-registration with the backend
 * - REST API fallback with JWT authentication
 * - Automatic reconnection on disconnect
 * - Configurable via environment variables
 * 
 * Usage:
 *   npm install
 *   cp .env.example .env  # configure your settings
 *   npm start             # run continuously
 *   npm run -- --once     # send one heartbeat and exit (for cron)
 */

import 'dotenv/config';
import { io, Socket } from 'socket.io-client';

// ============================================
// Configuration
// ============================================

interface Config {
  backendWsUrl: string;
  backendApiUrl: string;
  agentToken: string | null;
  agentName: string;
  agentDisplayName: string;
  agentDescription: string;
  agentProvider: string;
  agentModel: string;
  agentPort: number;
  heartbeatIntervalMs: number;
  reconnectDelayMs: number;
  maxReconnectAttempts: number;
  once: boolean;
}

function loadConfig(): Config {
  const args = process.argv.slice(2);
  return {
    backendWsUrl: process.env.BACKEND_WS_URL || 'http://localhost:3001',
    backendApiUrl: process.env.BACKEND_API_URL || 'http://localhost:3001',
    agentToken: process.env.AGENT_TOKEN || null,
    agentName: process.env.AGENT_NAME || 'local_agent',
    agentDisplayName: process.env.AGENT_DISPLAY_NAME || 'Local Agent',
    agentDescription: process.env.AGENT_DESCRIPTION || 'Auto-registered local AI agent',
    agentProvider: process.env.AGENT_PROVIDER || 'ollama',
    agentModel: process.env.AGENT_MODEL || 'default',
    agentPort: parseInt(process.env.AGENT_PORT || '11434', 10),
    heartbeatIntervalMs: parseInt(process.env.HEARTBEAT_INTERVAL_MS || '30000', 10),
    reconnectDelayMs: parseInt(process.env.RECONNECT_DELAY_MS || '5000', 10),
    maxReconnectAttempts: parseInt(process.env.MAX_RECONNECT_ATTEMPTS || '0', 10),
    once: args.includes('--once'),
  };
}

// ============================================
// Logging
// ============================================

function log(level: 'info' | 'warn' | 'error' | 'debug', message: string) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  console.log(`${prefix} ${message}`);
}

// ============================================
// REST API Client
// ============================================

async function apiRequest<T>(
  config: Config,
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(config.agentToken ? { Authorization: `Bearer ${config.agentToken}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  const res = await fetch(`${config.backendApiUrl}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API ${res.status}: ${err}`);
  }

  if (res.status === 204) return undefined as T;
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text();
    throw new Error(`Expected JSON response but got ${contentType}: ${text.substring(0, 200)}`);
  }
  const data: unknown = await res.json();
  return data as T;
}

// ============================================
// Agent Registration
// ============================================

interface AgentRecord {
  id: string;
  name: string;
  displayName: string;
  status: string;
}

async function ensureAgentRegistered(config: Config): Promise<string> {
  log('info', 'Checking if agent is registered...');

  try {
    const agents = await apiRequest<AgentRecord[]>(
      config,
      `/agents?search=${encodeURIComponent(config.agentName)}`
    );

    if (agents.length > 0) {
      const agent = agents[0];
      log('info', `Agent found: ${agent.id} (${agent.name})`);
      return agent.id;
    }
  } catch (err) {
    log('warn', `Could not check existing agents: ${(err as Error).message}`);
  }

  // Register new agent
  log('info', 'Registering new agent...');

  const agent = await apiRequest<AgentRecord>(config, '/agents', {
    method: 'POST',
    body: JSON.stringify({
      name: config.agentName,
      displayName: config.agentDisplayName,
      description: config.agentDescription,
      capabilities: ['agentic-coding'],
      config: {
        provider: config.agentProvider,
        model: config.agentModel,
        temperature: 0.7,
        maxTokens: 4096,
        apiEndpoint: `http://localhost:${config.agentPort}`,
      },
    }),
  });

  log('info', `Agent registered: ${agent.id}`);
  return agent.id;
}

// ============================================
// REST Heartbeat
// ============================================

async function sendRestHeartbeat(config: Config, agentId: string): Promise<boolean> {
  try {
    await apiRequest(config, `/agents/${agentId}/heartbeat`, {
      method: 'POST',
    });
    return true;
  } catch (err) {
    log('error', `REST heartbeat failed: ${(err as Error).message}`);
    return false;
  }
}

// ============================================
// WebSocket Client
// ============================================

function createWebSocketClient(
  config: Config,
  agentId: string
): Socket {
  const socket = io(`${config.backendWsUrl}/agents`, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: config.maxReconnectAttempts || Infinity,
    reconnectionDelay: config.reconnectDelayMs,
    reconnectionDelayMax: 30000,
    timeout: 10000,
  });

  let heartbeatTimer: NodeJS.Timeout | null = null;
  let restFallbackTimer: NodeJS.Timeout | null = null;

  function startHeartbeat() {
    if (heartbeatTimer) clearInterval(heartbeatTimer);

    heartbeatTimer = setInterval(() => {
      if (socket.connected) {
        log('debug', `Sending WebSocket heartbeat for agent ${agentId}`);
        socket.emit('agent:heartbeat', { agentId });
      }
    }, config.heartbeatIntervalMs);

    // Send initial heartbeat immediately
    socket.emit('agent:heartbeat', { agentId });
  }

  function stopHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    if (restFallbackTimer) {
      clearInterval(restFallbackTimer);
      restFallbackTimer = null;
    }
  }

  // Event handlers
  socket.on('connect', () => {
    log('info', `WebSocket connected (id: ${socket.id})`);
    startHeartbeat();
  });

  socket.on('disconnect', (reason) => {
    log('warn', `WebSocket disconnected: ${reason}`);
    stopHeartbeat();
  });

  socket.on('connect_error', (err) => {
    log('error', `WebSocket connection error: ${err.message}`);
  });

  socket.on('agent:heartbeat:ack', (data) => {
    log('debug', `Heartbeat acknowledged: status=${data.status}`);
  });

  socket.on('agent:heartbeat:error', (data) => {
    log('error', `Heartbeat rejected: ${data.message}`);
  });

  socket.on('agent:status', (data) => {
    if (data.id === agentId) {
      log('info', `Status update: ${data.status}`);
    }
  });

  socket.on('reconnect_attempt', (attempt) => {
    log('info', `Reconnection attempt ${attempt}...`);
  });

  socket.on('reconnect', () => {
    log('info', 'WebSocket reconnected');
    // Clear REST fallback if it was started
    if (restFallbackTimer) {
      clearInterval(restFallbackTimer);
      restFallbackTimer = null;
      log('info', 'REST fallback stopped - WebSocket is back');
    }
  });

  socket.on('reconnect_failed', () => {
    log('error', 'WebSocket reconnection failed - falling back to REST');
    startRestFallback();
  });

  // REST fallback when WebSocket fails
  function startRestFallback() {
    if (restFallbackTimer) return; // already running
    log('info', 'Starting REST heartbeat fallback...');
    restFallbackTimer = setInterval(async () => {
      await sendRestHeartbeat(config, agentId);
    }, config.heartbeatIntervalMs);
  }

  return socket;
}

// ============================================
// One-shot mode (for cron)
// ============================================

async function runOnce(config: Config): Promise<void> {
  const agentId = await ensureAgentRegistered(config);

  // Try WebSocket first
  log('info', 'Sending single heartbeat via WebSocket...');
  const socket = createWebSocketClient(config, agentId);

  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      log('warn', 'WebSocket timeout - falling back to REST');
      socket.disconnect();
      resolve();
    }, 5000);

    socket.on('connect', () => {
      clearTimeout(timeout);
      log('info', 'Heartbeat sent successfully');
      socket.emit('agent:heartbeat', { agentId });
      setTimeout(() => {
        socket.disconnect();
        resolve();
      }, 1000);
    });

    socket.on('connect_error', () => {
      clearTimeout(timeout);
      socket.disconnect();
      resolve();
    });

    socket.connect();
  });

  // REST fallback
  log('info', 'Sending single heartbeat via REST...');
  const ok = await sendRestHeartbeat(config, agentId);
  if (ok) {
    log('info', 'REST heartbeat sent successfully');
  }
}

// ============================================
// Main
// ============================================

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   AgentForge Heartbeat Client v1.0.0    ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');

  const config = loadConfig();

  log('info', `Backend URL: ${config.backendWsUrl}`);
  log('info', `Agent name: ${config.agentName}`);
  log('info', `Heartbeat interval: ${config.heartbeatIntervalMs}ms`);
  log('info', '');

  // One-shot mode for cron
  if (config.once) {
    log('info', 'Running in --once mode (single heartbeat)');
    await runOnce(config);
    log('info', 'Done!');
    return;
  }

  // Continuous mode
  const agentId = await ensureAgentRegistered(config);

  log('info', 'Connecting to AgentForge backend...');
  const socket = createWebSocketClient(config, agentId);

  socket.connect();

  // Handle graceful shutdown — registered AFTER socket is created
  function shutdown(signal: string) {
    log('info', `Received ${signal}. Shutting down...`);

    if (socket.connected) {
      socket.emit('agent:status', { agentId, status: 'offline' });
      socket.disconnect();
    }

    log('info', 'Goodbye!');
    process.exit(0);
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  log('info', 'Heartbeat client running. Press Ctrl+C to stop.');
}

// Run
main().catch((err) => {
  log('error', `Fatal error: ${err.message}`);
  process.exit(1);
});
