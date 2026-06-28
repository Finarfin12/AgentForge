import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { AgentsModule } from './agents/agents.module';
import { TasksModule } from './tasks/tasks.module';
import { DiscoveryModule } from './discovery/discovery.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { PipelinesModule } from './pipelines/pipelines.module';
import { ThreadsModule } from './threads/threads.module';
import { DeliberationModule } from './threads/deliberation.module';
import { LogsModule } from './logs/logs.module';
import { SearchModule } from './search/search.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AgentMessagesModule } from './agent-messages/agent-messages.module';
import { RuntimesModule } from './runtimes/runtimes.module';
import { SquadsModule } from './squads/squads.module';
import { AutopilotsModule } from './autopilots/autopilots.module';
import { SkillsModule } from './skills/skills.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { PluginsModule } from './plugins/plugins.module';
import { MeshModule } from './mesh/mesh.module';
import { SettingsModule } from './settings/settings.module';
import { ReviewsModule } from './reviews/reviews.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    BullModule.forRootAsync({
      useFactory: () => ({
        connection: {
          host: process.env.REDIS_HOST || '127.0.0.1',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
          retryAttempts: 5,
          retryDelay: 3000,
          enableOfflineQueue: true,
          offlineQueue: true,
          lazyConnect: true,
          maxRetriesPerRequest: null,
        },
        defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
      }),
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    AgentsModule,
    TasksModule,
    DiscoveryModule,
    IntegrationsModule,
    PipelinesModule,
    ThreadsModule,
    DeliberationModule,
    LogsModule,
    SearchModule,
    NotificationsModule,
    AgentMessagesModule,
    RuntimesModule,
    SquadsModule,
    AutopilotsModule,
    SkillsModule,
    MarketplaceModule,
    PluginsModule,
    MeshModule,
    SettingsModule,
    ReviewsModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
