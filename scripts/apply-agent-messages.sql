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
