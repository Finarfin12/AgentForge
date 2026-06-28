import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, ParseUUIDPipe } from '@nestjs/common';
import { PipelinesService } from './pipelines.service';
import { CreatePipelineDto } from './dto/create-pipeline.dto';
import { UpdatePipelineDto } from './dto/update-pipeline.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('pipelines')
@UseGuards(JwtAuthGuard)
export class PipelinesController {
  constructor(private readonly pipelinesService: PipelinesService) {}

  @Post()
  create(@Body() createPipelineDto: CreatePipelineDto, @Request() req) {
    return this.pipelinesService.create(createPipelineDto, req.user.userId);
  }

  @Get()
  findAll() {
    return this.pipelinesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.pipelinesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updatePipelineDto: UpdatePipelineDto) {
    return this.pipelinesService.update(id, updatePipelineDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.pipelinesService.remove(id);
  }

  // Steps
  @Get(':id/steps')
  getSteps(@Param('id', ParseUUIDPipe) id: string) {
    return this.pipelinesService.getSteps(id);
  }

  @Post(':id/steps')
  addStep(@Param('id', ParseUUIDPipe) id: string, @Body() data: any) {
    return this.pipelinesService.addStep(id, data);
  }

  @Delete(':id/steps/:stepId')
  removeStep(@Param('id', ParseUUIDPipe) id: string, @Param('stepId') stepId: string) {
    return this.pipelinesService.removeStep(id, stepId);
  }

  @Get(':id/executions')
  getExecutions(@Param('id', ParseUUIDPipe) id: string) {
    return this.pipelinesService.getExecutions(id);
  }

  @Get('templates/all')
  findTemplates() {
    return this.pipelinesService.findTemplates();
  }

  @Post(':id/save-template')
  saveAsTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: { templateName: string },
    @Request() req,
  ) {
    return this.pipelinesService.saveAsTemplate(id, data.templateName, req.user.userId);
  }

  @Post('from-template/:templateId')
  createFromTemplate(
    @Param('templateId', ParseUUIDPipe) templateId: string,
    @Body() data: { name: string },
    @Request() req,
  ) {
    return this.pipelinesService.createFromTemplate(templateId, data.name, req.user.userId);
  }

  // Execute
  @Post(':id/execute')
  executePipeline(@Param('id', ParseUUIDPipe) id: string, @Body() data: { input: string }, @Request() req) {
    return this.pipelinesService.executePipeline(id, data.input || '', req.user.userId);
  }
}
