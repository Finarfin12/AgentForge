import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  boolean,
  integer,
  decimal,
  bigint,
  pgEnum,
  customType,
} from 'drizzle-orm/pg-core';

// ============================================
// ENUMS
// ============================================
export const agentStatusEnum = pgEnum('agent_status', ['idle','busy','offline','error']);
export const taskStatusEnum = pgEnum('task_status', ['pending','assigned','running','completed','failed','cancelled','delegated']);
export const threadStatusEnum = pgEnum('thread_status', ['active','resolved','archived']);
export const messageRoleEnum = pgEnum('message_role', ['user','agent','system']);
export const logLevelEnum = pgEnum('log_level', ['debug','info','warn','error','fatal']);
export const delegationReasonEnum = pgEnum('delegation_reason', ['capability_mismatch','load_balance','user_request','error_fallback','specialization']);
export const agentMessageTypeEnum = pgEnum('agent_message_type', ['message','delegation','debug_request','discussion','autoreply']);
export const agentMessageStatusEnum = pgEnum('agent_message_status', ['unread','read','archived']);
export const agentMessagePriorityEnum = pgEnum('agent_message_priority', ['low','normal','high']);
export const runtimeStatusEnum = pgEnum('runtime_status', ['online','offline','error']);
export const runtimeModeEnum = pgEnum('runtime_mode', ['local','cloud']);
export const autopilotStatusEnum = pgEnum('autopilot_status', ['active','paused','archived']);
export const autopilotRunStatusEnum = pgEnum('autopilot_run_status', ['pending','running','completed','failed','skipped']);
export const triggerKindEnum = pgEnum('trigger_kind', ['schedule','webhook']);
export const skillOriginEnum = pgEnum('skill_origin', ['built_in','custom','marketplace','local']);

// ============================================
// USERS
// ============================================
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  username: varchar('username', { length: 100 }).notNull().unique(),
  displayName: varchar('display_name', { length: 255 }),
  passwordHash: varchar('password_hash', { length: 255 }),
  avatarUrl: text('avatar_url'),
  role: varchar('role', { length: 50 }).default('user'),
  preferences: jsonb('preferences').default({}),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  resetToken: varchar('reset_token', { length: 255 }),
  resetTokenExpiry: timestamp('reset_token_expiry', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ============================================
// AGENT RUNTIMES
// ============================================
export const agentRuntimes = pgTable('agent_runtimes', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  provider: varchar('provider', { length: 100 }).notNull(),
  status: runtimeStatusEnum('status').default('offline'),
  mode: runtimeModeEnum('mode').default('local'),
  daemonId: varchar('daemon_id', { length: 255 }),
  deviceName: varchar('device_name', { length: 255 }),
  deviceInfo: text('device_info').default(''),
  version: varchar('version', { length: 50 }).default(''),
  metadata: jsonb('metadata').default({}),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
  visibility: varchar('visibility', { length: 20 }).default('private'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ============================================
// AGENTS
// ============================================
export const agents = pgTable('agents', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  description: text('description'),
  avatarUrl: text('avatar_url'),
  status: agentStatusEnum('status').default('idle'),
  capabilities: jsonb('capabilities').default([]).notNull(),
  config: jsonb('config').default({}).notNull(),
  runtimeId: uuid('runtime_id').references(() => agentRuntimes.id, { onDelete: 'set null' }),
  credentials: jsonb('credentials').default({}),
  maxConcurrentTasks: integer('max_concurrent_tasks').default(5),
  currentTaskCount: integer('current_task_count').default(0),
  avgResponseTimeMs: integer('avg_response_time_ms').default(0),
  successRate: decimal('success_rate', { precision: 5, scale: 2 }).default('100.00'),
  totalTasksCompleted: integer('total_tasks_completed').default(0),
  totalTokensUsed: bigint('total_tokens_used', { mode: 'number' }).default(0),
  isActive: boolean('is_active').default(true),
  lastHeartbeatAt: timestamp('last_heartbeat_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ============================================
// AGENT SKILLS (many-to-many)
// ============================================
export const agentSkills = pgTable('agent_skills', {
  agentId: uuid('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
  skillId: uuid('skill_id').notNull().references(() => skills.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => ({ pk: { columns: [t.agentId, t.skillId] } }));

// ============================================
// SKILLS (upgrade from agent_memories)
// ============================================
export const skills = pgTable('skills', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description').default(''),
  content: text('content').default(''),
  config: jsonb('config').default({}),
  origin: skillOriginEnum('origin').default('custom'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ============================================
// SKILL FILES (supporting files for skills)
// ============================================
export const skillFiles = pgTable('skill_files', {
  id: uuid('id').defaultRandom().primaryKey(),
  skillId: uuid('skill_id').notNull().references(() => skills.id, { onDelete: 'cascade' }),
  path: varchar('path', { length: 500 }).notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ============================================
// TASKS
// ============================================
export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  status: taskStatusEnum('status').default('pending'),
  priority: integer('priority').default(0),
  assignedAgentId: uuid('assigned_agent_id').references(() => agents.id, { onDelete: 'set null' }),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  pipelineId: uuid('pipeline_id'),
  pipelineStepId: uuid('pipeline_step_id'),
  parentTaskId: uuid('parent_task_id'),
  input: jsonb('input').default({}),
  output: jsonb('output').default({}),
  error: jsonb('error'),
  tokenUsage: jsonb('token_usage').default({ input: 0, output: 0 }),
  durationMs: integer('duration_ms'),
  retryCount: integer('retry_count').default(0),
  maxRetries: integer('max_retries').default(3),
  tags: text('tags').array().default([]),
  metadata: jsonb('metadata').default({}),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ============================================
// THREADS
// ============================================
export const threads = pgTable('threads', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  status: threadStatusEnum('status').default('active'),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'set null' }),
  participantAgentIds: uuid('participant_agent_ids').array().default([]),
  messageCount: integer('message_count').default(0),
  consensusReached: boolean('consensus_reached').default(false),
  consensusResult: jsonb('consensus_result'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const threadMessages = pgTable('thread_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  threadId: uuid('thread_id').notNull().references(() => threads.id, { onDelete: 'cascade' }),
  role: messageRoleEnum('role').notNull(),
  agentId: uuid('agent_id').references(() => agents.id, { onDelete: 'set null' }),
  agentName: varchar('agent_name', { length: 100 }),
  content: text('content').notNull(),
  attachments: jsonb('attachments').default([]),
  parentMessageId: uuid('parent_message_id'),
  reactions: jsonb('reactions').default({}),
  isConsensusVote: boolean('is_consensus_vote').default(false),
  deliberationSessionId: uuid('deliberation_session_id'),
  deliberationRoundId: uuid('deliberation_round_id'),
  voteData: jsonb('vote_data'),
  tokenUsage: jsonb('token_usage').default({ input: 0, output: 0 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const deliberationSessions = pgTable('deliberation_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  threadId: uuid('thread_id').notNull().references(() => threads.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 50 }).default('initializing'),
  currentRound: integer('current_round').default(0),
  maxRounds: integer('max_rounds').default(3),
  consensusThreshold: decimal('consensus_threshold', { precision: 3, scale: 2 }).default('0.67'),
  participantAgentIds: uuid('participant_agent_ids').array().default([]),
  problemStatement: text('problem_statement').notNull(),
  discussionContext: jsonb('discussion_context').default({}),
  consensusReached: boolean('consensus_reached').default(false),
  consensusResult: jsonb('consensus_result'),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  timeoutSeconds: integer('timeout_seconds').default(300),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const deliberationRounds = pgTable('deliberation_rounds', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').notNull().references(() => deliberationSessions.id, { onDelete: 'cascade' }),
  roundNumber: integer('round_number').notNull(),
  status: varchar('status', { length: 50 }).default('pending'),
  roundPrompt: text('round_prompt'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ============================================
// PIPELINES
// ============================================
export const pipelines = pgTable('pipelines', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 300 }).notNull(),
  description: text('description'),
  config: jsonb('config').default({}),
  status: varchar('status', { length: 50 }).default('draft'),
  triggerType: varchar('trigger_type', { length: 50 }).default('manual'),
  isTemplate: boolean('is_template').default(false),
  totalSteps: integer('total_steps').default(0),
  currentStepIndex: integer('current_step_index').default(0),
  runCount: integer('run_count').default(0),
  lastRunAt: timestamp('last_run_at', { withTimezone: true }),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const pipelineSteps = pgTable('pipeline_steps', {
  id: uuid('id').defaultRandom().primaryKey(),
  pipelineId: uuid('pipeline_id').notNull().references(() => pipelines.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 300 }).notNull(),
  description: text('description'),
  stepOrder: integer('step_order').default(0),
  agentId: uuid('agent_id').references(() => agents.id, { onDelete: 'set null' }),
  agentName: varchar('agent_name', { length: 100 }),
  config: jsonb('config').default({}),
  status: varchar('status', { length: 50 }).default('pending'),
  inputMapping: jsonb('input_mapping'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const pipelineExecutions = pgTable('pipeline_executions', {
  id: uuid('id').defaultRandom().primaryKey(),
  pipelineId: uuid('pipeline_id').notNull().references(() => pipelines.id, { onDelete: 'cascade' }),
  triggerType: varchar('trigger_type', { length: 50 }).default('manual'),
  triggeredBy: varchar('triggered_by', { length: 100 }),
  status: varchar('status', { length: 50 }).default('pending'),
  input: jsonb('input').default({}),
  output: jsonb('output').default({}),
  error: jsonb('error'),
  durationMs: integer('duration_ms'),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ============================================
// AGENT MESSAGES (Email-like)
// ============================================
export const agentMessages = pgTable('agent_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  threadId: uuid('thread_id'),
  parentId: uuid('parent_id'),
  fromAgentId: uuid('from_agent_id').notNull().references(() => agents.id),
  toAgentId: uuid('to_agent_id').notNull().references(() => agents.id),
  subject: varchar('subject', { length: 200 }).notNull(),
  body: text('body').notNull(),
  type: agentMessageTypeEnum('type').default('message'),
  status: agentMessageStatusEnum('status').default('unread'),
  priority: agentMessagePriorityEnum('priority').default('normal'),
  relatedTaskId: uuid('related_task_id').references(() => tasks.id, { onDelete: 'set null' }),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ============================================
// AGENT MEMORIES (Vector Store - keep for RAG)
// ============================================
const customVector = customType<{ data: number[] }>({
  dataType() { return 'vector(1536)'; },
  toDriver(value: number[]) { return JSON.stringify(value); },
  fromDriver(value: any) { return JSON.parse(value as string); },
});

export const agentMemories = pgTable('agent_memories', {
  id: uuid('id').defaultRandom().primaryKey(),
  agentId: uuid('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
  taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'set null' }),
  content: text('content').notNull(),
  embedding: customVector('embedding'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ============================================
// SQUADS (upgrade from agent_groups)
// ============================================
export const squads = pgTable('squads', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description').default(''),
  instructions: text('instructions').default(''),
  leaderId: uuid('leader_id').notNull().references(() => agents.id, { onDelete: 'restrict' }),
  avatarUrl: text('avatar_url'),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  archivedBy: uuid('archived_by').references(() => users.id, { onDelete: 'set null' }),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const squadMembers = pgTable('squad_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  squadId: uuid('squad_id').notNull().references(() => squads.id, { onDelete: 'cascade' }),
  agentId: uuid('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 50 }).default('member'),
  addedAt: timestamp('added_at', { withTimezone: true }).defaultNow(),
}, (t) => ({ uniq: { columns: [t.squadId, t.agentId] } }));

// ============================================
// AUTOPILOTS (upgrade from scheduled_tasks)
// ============================================
export const autopilots = pgTable('autopilots', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 300 }).notNull(),
  description: text('description'),
  status: autopilotStatusEnum('status').default('active'),
  assigneeType: varchar('assignee_type', { length: 20 }).default('agent'),
  assigneeId: uuid('assignee_id'),
  executionMode: varchar('execution_mode', { length: 30 }).default('create_task'),
  issueTitleTemplate: text('issue_title_template'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  lastRunAt: timestamp('last_run_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const autopilotTriggers = pgTable('autopilot_triggers', {
  id: uuid('id').defaultRandom().primaryKey(),
  autopilotId: uuid('autopilot_id').notNull().references(() => autopilots.id, { onDelete: 'cascade' }),
  kind: triggerKindEnum('kind').notNull(),
  enabled: boolean('enabled').default(true),
  cronExpression: varchar('cron_expression', { length: 100 }),
  timezone: varchar('timezone', { length: 50 }).default('UTC'),
  webhookToken: varchar('webhook_token', { length: 255 }),
  label: varchar('label', { length: 200 }),
  lastFiredAt: timestamp('last_fired_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const autopilotRuns = pgTable('autopilot_runs', {
  id: uuid('id').defaultRandom().primaryKey(),
  autopilotId: uuid('autopilot_id').notNull().references(() => autopilots.id, { onDelete: 'cascade' }),
  triggerId: uuid('trigger_id').references(() => autopilotTriggers.id, { onDelete: 'set null' }),
  source: varchar('source', { length: 30 }).notNull(),
  status: autopilotRunStatusEnum('status').default('pending'),
  taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'set null' }),
  triggerPayload: jsonb('trigger_payload'),
  result: jsonb('result'),
  failureReason: text('failure_reason'),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ============================================
// AGENT REVIEWS (Rating System)
// ============================================
export const agentReviews = pgTable('agent_reviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  agentId: uuid('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  rating: integer('rating').notNull(),
  title: varchar('title', { length: 200 }),
  review: text('review'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => ({ uniq: { columns: [t.agentId, t.userId] } }));

// ============================================
// SYSTEM LOGS
// ============================================
export const systemLogs = pgTable('system_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  level: logLevelEnum('level').notNull(),
  source: varchar('source', { length: 100 }).notNull(),
  sourceId: uuid('source_id'),
  message: text('message').notNull(),
  details: jsonb('details').default({}),
  traceId: varchar('trace_id', { length: 100 }),
  spanId: varchar('span_id', { length: 100 }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  agentId: uuid('agent_id').references(() => agents.id, { onDelete: 'set null' }),
  taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const auditLog = pgTable('audit_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 100 }).notNull(),
  resourceType: varchar('resource_type', { length: 100 }).notNull(),
  resourceId: uuid('resource_id'),
  oldValue: jsonb('old_value'),
  newValue: jsonb('new_value'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ============================================
// SETTINGS (global key-value)
// ============================================
export const settings = pgTable('settings', {
  key: varchar('key', { length: 100 }).primaryKey(),
  value: jsonb('value').notNull(),
  category: varchar('category', { length: 50 }).notNull().default('general'),
  description: text('description').default(''),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
