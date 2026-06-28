import { Controller, Get, Post, Put, Param, Body, Req, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private service: SettingsService) {}

  @Get()
  getAll() {
    return this.service.getAll();
  }

  @Get('category/:category')
  getByCategory(@Param('category') category: string) {
    return this.service.getByCategory(category);
  }

  @Get(':key')
  getKey(@Param('key') key: string) {
    return this.service.getKey(key);
  }

  @Put(':key')
  setKey(@Param('key') key: string, @Body() body: { value: any; category?: string; description?: string }) {
    return this.service.setKey(key, body);
  }

  @Get('profile/me')
  getProfile(@Req() req: any) {
    return this.service.getProfile(req.user.userId);
  }

  @Put('profile/me')
  updateProfile(@Req() req: any, @Body() body: Record<string, any>) {
    return this.service.updateProfile(req.user.userId, body);
  }
}
