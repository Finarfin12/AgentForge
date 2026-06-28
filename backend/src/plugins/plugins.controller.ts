import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { PluginManagerService } from './plugin-manager.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('plugins')
@UseGuards(JwtAuthGuard)
export class PluginsController {
  constructor(private manager: PluginManagerService) {}

  @Get()
  list() {
    return { plugins: this.manager.getPlugins() };
  }

  @Get(':name')
  get(@Param('name') name: string) {
    return this.manager.getPlugin(name);
  }

  @Post(':name/reload')
  reload(@Param('name') name: string) {
    return this.manager.reload(name);
  }

  @Post(':name/toggle')
  toggle(@Param('name') name: string, @Body() body: { enabled: boolean }) {
    return this.manager.setEnabled(name, body.enabled);
  }
}
