import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('integrations')
@UseGuards(JwtAuthGuard)
export class IntegrationsController {
  constructor(private integrationsService: IntegrationsService) {}

  @Get('providers')
  listProviders() {
    return { providers: this.integrationsService.listProviders() };
  }

  @Get('providers/health')
  healthCheckAll() {
    return this.integrationsService.healthCheckAll();
  }

  @Get('providers/:name/models')
  listModels(@Param('name') name: string) {
    return this.integrationsService.listModels(name);
  }

  @Post('providers/:name/chat')
  chatCompletion(
    @Param('name') providerName: string,
    @Body() body: { model: string; messages: any[]; temperature?: number; maxTokens?: number },
  ) {
    return this.integrationsService.chatCompletion(providerName, body);
  }
}
