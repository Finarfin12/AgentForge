import { Module } from '@nestjs/common';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';
import { SkillsModule } from '../skills/skills.module';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [SkillsModule, DatabaseModule],
  controllers: [MarketplaceController],
  providers: [MarketplaceService],
})
export class MarketplaceModule {}
