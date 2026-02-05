import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { PipelinesService } from './pipelines.service';
import {
  CreatePipelineDto,
  UpdatePipelineDto,
  CreateStageDto,
  UpdateStageDto,
  ReorderStagesDto,
} from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentOrganization } from '../common/decorators/current-organization.decorator';
import { Role } from '@prisma/client';

@Controller('pipelines')
@UseGuards(JwtAuthGuard)
export class PipelinesController {
  constructor(private readonly pipelinesService: PipelinesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN, Role.MANAGER)
  create(
    @CurrentOrganization() organization: any,
    @Body() dto: CreatePipelineDto,
  ) {
    return this.pipelinesService.create(organization.id, dto);
  }

  @Get()
  findAll(@CurrentOrganization() organization: any) {
    return this.pipelinesService.findAll(organization.id);
  }

  @Get(':id')
  findOne(
    @CurrentOrganization() organization: any,
    @Param('id') id: string,
  ) {
    return this.pipelinesService.findOne(organization.id, id);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN, Role.MANAGER)
  update(
    @CurrentOrganization() organization: any,
    @Param('id') id: string,
    @Body() dto: UpdatePipelineDto,
  ) {
    return this.pipelinesService.update(organization.id, id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  remove(
    @CurrentOrganization() organization: any,
    @Param('id') id: string,
  ) {
    return this.pipelinesService.remove(organization.id, id);
  }

  // ============== STAGES ==============

  @Post(':id/stages')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN, Role.MANAGER)
  createStage(
    @CurrentOrganization() organization: any,
    @Param('id') pipelineId: string,
    @Body() dto: CreateStageDto,
  ) {
    return this.pipelinesService.createStage(organization.id, pipelineId, dto);
  }

  @Put(':id/stages/:stageId')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN, Role.MANAGER)
  updateStage(
    @CurrentOrganization() organization: any,
    @Param('id') pipelineId: string,
    @Param('stageId') stageId: string,
    @Body() dto: UpdateStageDto,
  ) {
    return this.pipelinesService.updateStage(organization.id, pipelineId, stageId, dto);
  }

  @Delete(':id/stages/:stageId')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  removeStage(
    @CurrentOrganization() organization: any,
    @Param('id') pipelineId: string,
    @Param('stageId') stageId: string,
  ) {
    return this.pipelinesService.removeStage(organization.id, pipelineId, stageId);
  }

  @Patch(':id/stages/reorder')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN, Role.MANAGER)
  reorderStages(
    @CurrentOrganization() organization: any,
    @Param('id') pipelineId: string,
    @Body() dto: ReorderStagesDto,
  ) {
    return this.pipelinesService.reorderStages(organization.id, pipelineId, dto);
  }
}
