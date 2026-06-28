CREATE TYPE "public"."agent_message_type" AS ENUM('message', 'delegation', 'debug_request', 'discussion', 'autoreply');--> statement-breakpoint
CREATE TYPE "public"."agent_message_status" AS ENUM('unread', 'read', 'archived');--> statement-breakpoint
CREATE TYPE "public"."agent_message_priority" AS ENUM('low', 'normal', 'high');--> statement-breakpoint
CREATE TABLE "agent_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid,
	"parent_id" uuid,
	"from_agent_id" uuid NOT NULL,
	"to_agent_id" uuid NOT NULL,
	"subject" varchar(200) NOT NULL,
	"body" text NOT NULL,
	"type" "agent_message_type" DEFAULT 'message',
	"status" "agent_message_status" DEFAULT 'unread',
	"priority" "agent_message_priority" DEFAULT 'normal',
	"related_task_id" uuid,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);--> statement-breakpoint
ALTER TABLE "agent_messages" ADD CONSTRAINT "agent_messages_from_agent_id_agents_id_fk" FOREIGN KEY ("from_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_messages" ADD CONSTRAINT "agent_messages_to_agent_id_agents_id_fk" FOREIGN KEY ("to_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_messages" ADD CONSTRAINT "agent_messages_related_task_id_tasks_id_fk" FOREIGN KEY ("related_task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;
