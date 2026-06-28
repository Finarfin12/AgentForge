import { Controller, Get, Post, Patch, Delete, Param, Body, Req, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('reviews')
export class ReviewsController {
  constructor(private service: ReviewsService) {}

  @Get('agent/:agentId')
  findByAgent(@Param('agentId', ParseUUIDPipe) agentId: string) {
    return this.service.findByAgent(agentId);
  }

  @Get('agent/:agentId/stats')
  stats(@Param('agentId', ParseUUIDPipe) agentId: string) {
    return this.service.getStats(agentId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() body: { agentId: string; rating: number; title?: string; review?: string }, @Req() req: any) {
    return this.service.create({ ...body, userId: req.user.userId });
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() body: { rating?: number; title?: string; review?: string }, @Req() req: any) {
    return this.service.update(id, req.user.userId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.service.remove(id, req.user.userId);
  }
}
