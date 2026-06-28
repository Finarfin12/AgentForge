-- ============================================
-- EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================
-- ENUMS
-- ============================================
CREATE TYPE agent_status AS ENUM ('idle', 'busy', 'offline', 'error');
CREATE TYPE task_status AS ENUM ('pending', 'assigned', 'running', 'completed', 'failed', 'cancelled', 'delegated');
CREATE TYPE pipeline_status AS ENUM ('draft', 'active', 'running', 'completed', 'failed', 'paused');
CREATE TYPE pipeline_step_status AS ENUM ('pending', 'running', 'completed', 'failed', 'skipped');
CREATE TYPE thread_status AS ENUM ('active', 'resolved', 'archived');
CREATE TYPE message_role AS ENUM ('user', 'agent', 'system');
CREATE TYPE log_level AS ENUM ('debug', 'info', 'warn', 'error', 'fatal');
CREATE TYPE delegation_reason AS ENUM ('capability_mismatch', 'load_balance', 'user_request', 'error_fallback', 'specialization');

-- ============================================
-- USERS
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    password_hash VARCHAR(255),  -- NULL if OAuth-only
    avatar_url TEXT,
    role VARCHAR(50) DEFAULT 'user',  -- user, admin, superadmin
    preferences JSONB DEFAULT '{}',
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================
-- AGENTS
-- ============================================
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,  -- 'hermes', 'openclaw', 'codex', 'claude-code', 'antigravity'
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    avatar_url TEXT,
    status agent_status DEFAULT 'idle',
    capabilities JSONB NOT NULL DEFAULT '[]',
    -- capabilities example: ["code_generation", "code_review", "testing", "deployment"]
    config JSONB NOT NULL DEFAULT '{}',
    -- config example: { "model": "gpt-4", "temperature": 0.7, "max_tokens": 4096, "api_endpoint": "..." }
    credentials JSONB DEFAULT '{}',  -- Encrypted at rest
    max_concurrent_tasks INT DEFAULT 5,
    current_task_count INT DEFAULT 0,
    avg_response_time_ms INT DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 100.00,
    total_tasks_completed INT DEFAULT 0,
    total_tokens_used BIGINT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    last_heartbeat_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_name ON agents(name);
CREATE INDEX idx_agents_capabilities ON agents USING GIN(capabilities);

-- ============================================
-- AGENT SKILLS (tool calling definitions)
-- ============================================
CREATE TABLE agent_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    schema JSONB NOT NULL DEFAULT '{}',  -- JSON Schema for tool parameters
    endpoint VARCHAR(500),  -- External API endpoint if needed
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(agent_id, name)
);

CREATE INDEX idx_agent_skills_agent ON agent_skills(agent_id);

-- ============================================
-- TASKS
-- ============================================
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status task_status DEFAULT 'pending',
    priority INT DEFAULT 0,  -- 0=low, 1=medium, 2=high, 3=critical
    assigned_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    pipeline_id UUID,  -- FK added after pipelines table
    pipeline_step_id UUID,  -- FK added after pipeline_steps table
    parent_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,  -- For subtasks
    input JSONB DEFAULT '{}',  -- Task input parameters
    output JSONB DEFAULT '{}',  -- Task result/output
    error JSONB,  -- Error details if failed
    token_usage JSONB DEFAULT '{"input": 0, "output": 0}',
    duration_ms INT,
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assigned_agent ON tasks(assigned_agent_id);
CREATE INDEX idx_tasks_created_by ON tasks(created_by);
CREATE INDEX idx_tasks_pipeline ON tasks(pipeline_id);
CREATE INDEX idx_tasks_parent ON tasks(parent_task_id);
CREATE INDEX idx_tasks_tags ON tasks USING GIN(tags);
CREATE INDEX idx_tasks_created_at ON tasks(created_at DESC);

-- ============================================
-- PIPELINES
-- ============================================
CREATE TABLE pipelines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status pipeline_status DEFAULT 'draft',
    created_by UUID NOT NULL REFERENCES users(id),
    trigger_type VARCHAR(50) DEFAULT 'manual',  -- manual, webhook, schedule
    trigger_config JSONB DEFAULT '{}',
    config JSONB DEFAULT '{}',  -- Pipeline-level config (timeout, retry policy)
    current_step_index INT DEFAULT 0,
    total_steps INT DEFAULT 0,
    run_count INT DEFAULT 0,
    last_run_at TIMESTAMPTZ,
    is_template BOOLEAN DEFAULT false,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pipelines_status ON pipelines(status);
CREATE INDEX idx_pipelines_created_by ON pipelines(created_by);

ALTER TABLE tasks ADD CONSTRAINT fk_tasks_pipeline
    FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE SET NULL;

-- ============================================
-- PIPELINE STEPS
-- ============================================
CREATE TABLE pipeline_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    step_order INT NOT NULL,
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    agent_name VARCHAR(100),  -- Denormalized for quick lookup
    skill_name VARCHAR(255),  -- Which skill/tool to invoke
    input_mapping JSONB DEFAULT '{}',  -- Map previous step outputs to this step's input
    config JSONB DEFAULT '{}',  -- Step-specific config
    status pipeline_step_status DEFAULT 'pending',
    condition_expression TEXT,  -- Conditional execution: "step_1.output.status === 'success'"
    timeout_seconds INT DEFAULT 300,
    retry_on_failure BOOLEAN DEFAULT true,
    max_retries INT DEFAULT 2,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pipeline_steps_pipeline ON pipeline_steps(pipeline_id);
CREATE INDEX idx_pipeline_steps_order ON pipeline_steps(pipeline_id, step_order);

ALTER TABLE tasks ADD CONSTRAINT fk_tasks_pipeline_step
    FOREIGN KEY (pipeline_step_id) REFERENCES pipeline_steps(id) ON DELETE SET NULL;

-- ============================================
-- PIPELINE EXECUTIONS (run history)
-- ============================================
CREATE TABLE pipeline_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    triggered_by UUID REFERENCES users(id),
    trigger_type VARCHAR(50) NOT NULL,
    status pipeline_status NOT NULL,
    current_step_index INT DEFAULT 0,
    input JSONB DEFAULT '{}',
    output JSONB DEFAULT '{}',
    error JSONB,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms INT
);

CREATE INDEX idx_pipeline_executions_pipeline ON pipeline_executions(pipeline_id);
CREATE INDEX idx_pipeline_executions_status ON pipeline_executions(status);

-- ============================================
-- DELEGATION LOG
-- ============================================
CREATE TABLE delegations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    from_agent_id UUID NOT NULL REFERENCES agents(id),
    to_agent_id UUID NOT NULL REFERENCES agents(id),
    reason delegation_reason NOT NULL,
    reason_detail JSONB DEFAULT '{}',
    -- reason_detail example: { "required_capability": "testing", "from_load": 5, "to_load": 1 }
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_delegations_task ON delegations(task_id);
CREATE INDEX idx_delegations_from_agent ON delegations(from_agent_id);
CREATE INDEX idx_delegations_to_agent ON delegations(to_agent_id);

-- ============================================
-- THREADS (agent collaboration)
-- ============================================
CREATE TABLE threads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status thread_status DEFAULT 'active',
    created_by UUID NOT NULL REFERENCES users(id),
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    participant_agent_ids UUID[] DEFAULT '{}',
    message_count INT DEFAULT 0,
    consensus_reached BOOLEAN DEFAULT false,
    consensus_result JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_threads_status ON threads(status);
CREATE INDEX idx_threads_created_by ON threads(created_by);
CREATE INDEX idx_threads_task ON threads(task_id);
CREATE INDEX idx_threads_participants ON threads USING GIN(participant_agent_ids);

-- ============================================
-- THREAD MESSAGES
-- ============================================
CREATE TABLE thread_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    role message_role NOT NULL,
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,  -- NULL for user messages
    agent_name VARCHAR(100),  -- Denormalized
    content TEXT NOT NULL,
    attachments JSONB DEFAULT '[]',  -- [{ "type": "code", "language": "ts", "content": "..." }]
    parent_message_id UUID REFERENCES thread_messages(id) ON DELETE SET NULL,  -- For replies
    reactions JSONB DEFAULT '{}',  -- { "agree": ["hermes", "codex"], "disagree": [] }
    is_consensus_vote BOOLEAN DEFAULT false,
    token_usage JSONB DEFAULT '{"input": 0, "output": 0}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_thread_messages_thread ON thread_messages(thread_id);
CREATE INDEX idx_thread_messages_agent ON thread_messages(agent_id);
CREATE INDEX idx_thread_messages_created ON thread_messages(created_at DESC);

-- ============================================
-- SYSTEM LOGS
-- ============================================
CREATE TABLE system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    level log_level NOT NULL,
    source VARCHAR(100) NOT NULL,  -- 'agent', 'pipeline', 'api', 'system'
    source_id UUID,  -- Reference to agent_id, task_id, pipeline_id, etc.
    message TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    trace_id VARCHAR(100),  -- OpenTelemetry trace ID
    span_id VARCHAR(100),   -- OpenTelemetry span ID
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    pipeline_id UUID REFERENCES pipelines(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_system_logs_level ON system_logs(level);
CREATE INDEX idx_system_logs_source ON system_logs(source);
CREATE INDEX idx_system_logs_agent ON system_logs(agent_id);
CREATE INDEX idx_system_logs_task ON system_logs(task_id);
CREATE INDEX idx_system_logs_created ON system_logs(created_at DESC);
CREATE INDEX idx_system_logs_trace ON system_logs(trace_id);

-- Partition logs by month for performance
CREATE TABLE system_logs_partitioned (
    LIKE system_logs INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE system_logs_2026_07 PARTITION OF system_logs_partitioned
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE system_logs_2026_08 PARTITION OF system_logs_partitioned
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
-- ... auto-generate monthly partitions via pg_partman

-- ============================================
-- WEBHOOKS
-- ============================================
CREATE TABLE webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    secret VARCHAR(255),  -- For HMAC signature verification
    events TEXT[] NOT NULL DEFAULT '{}',  -- ['task.completed', 'pipeline.failed', ...]
    is_active BOOLEAN DEFAULT true,
    last_triggered_at TIMESTAMPTZ,
    failure_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhooks_user ON webhooks(user_id);
CREATE INDEX idx_webhooks_events ON webhooks USING GIN(events);

-- ============================================
-- AGENT CONTEXT MEMORY (vector store)
-- ============================================
CREATE TABLE agent_memories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    embedding vector(1536),  -- OpenAI ada-002 dimension
    metadata JSONB DEFAULT '{}',
    -- metadata: { "type": "learned_pattern", "context": "code_review", "confidence": 0.95 }
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agent_memories_agent ON agent_memories(agent_id);
CREATE INDEX idx_agent_memories_embedding ON agent_memories USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- ============================================
-- AUDIT LOG
-- ============================================
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,  -- 'agent.config.updated', 'task.created', etc.
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,
    old_value JSONB,
    new_value JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_resource ON audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);

-- ============================================
-- AGENT MESSAGES (Email-like, v2 migration)
-- ============================================
DO $$ BEGIN
  CREATE TYPE agent_message_type AS ENUM('message', 'delegation', 'debug_request', 'discussion', 'autoreply');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE agent_message_status AS ENUM('unread', 'read', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE agent_message_priority AS ENUM('low', 'normal', 'high');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS agent_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID,
    parent_id UUID,
    from_agent_id UUID NOT NULL REFERENCES agents(id),
    to_agent_id UUID NOT NULL REFERENCES agents(id),
    subject VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    type agent_message_type DEFAULT 'message',
    status agent_message_status DEFAULT 'unread',
    priority agent_message_priority DEFAULT 'normal',
    related_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_messages_to ON agent_messages(to_agent_id, status);
CREATE INDEX IF NOT EXISTS idx_agent_messages_from ON agent_messages(from_agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_messages_thread ON agent_messages(thread_id);

-- ============================================
-- DELIBERATION SESSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS deliberation_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'initializing',
    current_round INT DEFAULT 0,
    max_rounds INT DEFAULT 3,
    consensus_threshold DECIMAL(3,2) DEFAULT 0.67,
    participant_agent_ids UUID[] DEFAULT '{}',
    problem_statement TEXT NOT NULL,
    discussion_context JSONB DEFAULT '{}',
    consensus_reached BOOLEAN DEFAULT false,
    consensus_result JSONB,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    timeout_seconds INT DEFAULT 300,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deliberation_sessions_thread ON deliberation_sessions(thread_id);

-- ============================================
-- DELIBERATION ROUNDS
-- ============================================
CREATE TABLE IF NOT EXISTS deliberation_rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES deliberation_sessions(id) ON DELETE CASCADE,
    round_number INT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    round_prompt TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deliberation_rounds_session ON deliberation_rounds(session_id);

-- ============================================
-- AGENT GROUPS
-- ============================================
CREATE TABLE IF NOT EXISTS agent_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES agent_groups(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',
    added_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_agent ON group_members(agent_id);

-- ============================================
-- SCHEDULED TASKS
-- ============================================
CREATE TABLE IF NOT EXISTS scheduled_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(300) NOT NULL,
    description TEXT,
    cron_expression VARCHAR(100) NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    action_config JSONB DEFAULT '{}',
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    group_id UUID REFERENCES agent_groups(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scheduled_task_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scheduled_task_id UUID NOT NULL REFERENCES scheduled_tasks(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    output TEXT,
    error TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_active ON scheduled_tasks(is_active);
CREATE INDEX IF NOT EXISTS idx_scheduled_task_logs_task ON scheduled_task_logs(scheduled_task_id);
