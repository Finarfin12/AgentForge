import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('marketplace')
@UseGuards(JwtAuthGuard)
export class MarketplaceController {
  constructor(private service: MarketplaceService) {}

  @Get('search')
  search(@Query('q') q: string, @Query('page') page?: string) {
    return this.service.search(q || '', page ? parseInt(page) : 1);
  }

  @Post('import')
  import(@Body() body: { repo: string }) {
    return this.service.import(body.repo);
  }
}
