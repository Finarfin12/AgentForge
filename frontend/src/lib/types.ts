// Shared types matching backend schema

export type AgentStatus = 'idle' | 'busy' | 'offline' | 'error';
export type TaskStatus = 'pending' | 'assigned' | 'running' | 'completed' | 'failed' | 'cancelled' | 'delegated';

export interface Agent {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  avatarUrl?: string;
  status: AgentStatus;
  capabilities: string[];
  config: Record<string, unknown>;
  maxConcurrentTasks: number;
  currentTaskCount: number;
  avgResponseTimeMs: number;
  successRate: string;
  totalTasksCompleted: number;
  totalTokensUsed: number;
  isActive: boolean;
  lastHeartbeatAt?: string;
  createdAt: string;
  updatedAt: string;
  skills?: AgentSkill[];
  runtimeId?: string;
  runtimeName?: string;
  runtimeProvider?: string;
  runtimeStatus?: string;
}

export interface AgentSkill {
  id: string;
  agentId: string;
  name: string;
  description?: string;
  schema: Record<string, unknown>;
  endpoint?: string;
  isEnabled: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: number;
  assignedAgentId?: string;
  createdBy: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  error?: Record<string, unknown>;
  metadata: Record<string, unknown>;
  retryCount: number;
  maxRetries: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  role: string;
}

export interface DiscoveredAgent {
  host: string;
  port: number;
  type: string;
  name: string;
  healthy: boolean;
  latencyMs?: number;
  models?: string[];
  detectedAt: string;
}

export interface Provider {
  name: string;
  healthy?: boolean;
  models?: string[];
}

export interface InvokeResult {
  agentId: string;
  agentName: string;
  provider: string;
  model: string;
  content: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  durationMs: number;
}
