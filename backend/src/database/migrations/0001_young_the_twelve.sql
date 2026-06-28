CREATE TABLE "deliberation_rounds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"round_number" integer NOT NULL,
	"status" varchar(50) DEFAULT 'pending',
	"round_prompt" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "deliberation_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"status" varchar(50) DEFAULT 'initializing',
	"current_round" integer DEFAULT 0,
	"max_rounds" integer DEFAULT 3,
	"consensus_threshold" numeric(3, 2) DEFAULT '0.67',
	"participant_agent_ids" uuid[] DEFAULT '{}',
	"problem_statement" text NOT NULL,
	"discussion_context" jsonb DEFAULT '{}'::jsonb,
	"consensus_reached" boolean DEFAULT false,
	"consensus_result" jsonb,
	"started_at" timestamp with time zone DEFAULT now(),
	"completed_at" timestamp with time zone,
	"timeout_seconds" integer DEFAULT 300,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "pipelines" ALTER COLUMN "tags" SET DATA TYPE text[];--> statement-breakpoint
ALTER TABLE "pipelines" ALTER COLUMN "tags" SET DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "tags" SET DATA TYPE text[];--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "tags" SET DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "threads" ALTER COLUMN "participant_agent_ids" SET DATA TYPE uuid[];--> statement-breakpoint
ALTER TABLE "threads" ALTER COLUMN "participant_agent_ids" SET DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "webhooks" ALTER COLUMN "events" SET DATA TYPE text[];--> statement-breakpoint
ALTER TABLE "webhooks" ALTER COLUMN "events" SET DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "thread_messages" ADD COLUMN "deliberation_session_id" uuid;--> statement-breakpoint
ALTER TABLE "thread_messages" ADD COLUMN "deliberation_round_id" uuid;--> statement-breakpoint
ALTER TABLE "thread_messages" ADD COLUMN "vote_data" jsonb;--> statement-breakpoint
ALTER TABLE "deliberation_rounds" ADD CONSTRAINT "deliberation_rounds_session_id_deliberation_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."deliberation_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliberation_sessions" ADD CONSTRAINT "deliberation_sessions_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."threads"("id") ON DELETE cascade ON UPDATE no action;