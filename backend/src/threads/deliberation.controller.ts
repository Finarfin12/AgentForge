import { Controller, Post, Get, Param, Body, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { DeliberationService } from './deliberation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('threads')
@UseGuards(JwtAuthGuard)
export class DeliberationController {
  constructor(private readonly deliberationService: DeliberationService) {}

  @Post(':id/deliberation/start')
  startDeliberation(
    @Param('id', ParseUUIDPipe) threadId: string,
    @Body() body: { problemStatement: string; agentIds?: string[]; maxRounds?: number; timeoutSeconds?: number }
  ) {
    return this.deliberationService.startDeliberation(
      threadId,
      body.problemStatement,
      {
        agentIds: body.agentIds,
        maxRounds: body.maxRounds,
        timeoutSeconds: body.timeoutSeconds,
      }
    );
  }

  @Get(':id/deliberation/status')
  getStatus(@Param('id', ParseUUIDPipe) threadId: string) {
    return this.deliberationService.getStatus(threadId);
  }
}
