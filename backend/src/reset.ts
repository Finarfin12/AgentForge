import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DatabaseService } from './database/database.service';
import { pipelines, pipelineSteps, pipelineExecutions } from './database/schema';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const db = app.get(DatabaseService);
  
  await db.drizzle.update(pipelines).set({ status: 'failed' });
  await db.drizzle.update(pipelineSteps).set({ status: 'failed' });
  await db.drizzle.update(pipelineExecutions).set({ status: 'failed' });
  
  console.log('Reset complete!');
  process.exit(0);
}
bootstrap();
