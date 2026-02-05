import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { DealsService } from './deals.service';
import { CreateDealDto, UpdateDealDto, FilterDealsDto, AssignDealDto, MoveDealDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentOrganization } from '../common/decorators/current-organization.decorator';
import { GetUser } from '../common/decorators/get-user.decorator';
import type { JwtPayload } from '../common/decorators/get-user.decorator';
import { Role } from '@prisma/client';

@Controller('deals')
@UseGuards(JwtAuthGuard)
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Post()
  create(
    @CurrentOrganization() organization: any,
    @GetUser() user: JwtPayload,
    @Body() dto: CreateDealDto,
  ) {
    return this.dealsService.create(organization.id, user.workspaceId, dto, user.organizationMemberId ?? undefined);
  }

  @Get()
  findAll(@CurrentOrganization() organization: any, @Query() filters: FilterDealsDto) {
    return this.dealsService.findAll(organization.id, filters);
  }

  @Get('stats')
  getStats(@CurrentOrganization() organization: any) {
    return this.dealsService.getStats(organization.id);
  }

  @Get('forecast')
  getForecast(@CurrentOrganization() organization: any) {
    return this.dealsService.getForecast(organization.id);
  }

  @Get('by-lead/:leadId')
  getByLead(@CurrentOrganization() organization: any, @Param('leadId') leadId: string) {
    return this.dealsService.getByLead(organization.id, leadId);
  }

  @Get('by-pipeline/:pipelineId')
  getByPipeline(@CurrentOrganization() organization: any, @Param('pipelineId') pipelineId: string) {
    return this.dealsService.getByPipeline(organization.id, pipelineId);
  }

  @Get(':id')
  findOne(@CurrentOrganization() organization: any, @Param('id') id: string) {
    return this.dealsService.findOne(organization.id, id);
  }

  @Get(':id/history')
  getHistory(@CurrentOrganization() organization: any, @Param('id') id: string) {
    return this.dealsService.getHistory(organization.id, id);
  }

  @Put(':id')
  update(@CurrentOrganization() organization: any, @Param('id') id: string, @Body() dto: UpdateDealDto) {
    return this.dealsService.update(organization.id, id, dto);
  }

  @Patch(':id')
  partialUpdate(@CurrentOrganization() organization: any, @Param('id') id: string, @Body() dto: UpdateDealDto) {
    return this.dealsService.update(organization.id, id, dto);
  }

  @Patch(':id/move')
  move(
    @CurrentOrganization() organization: any,
    @GetUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: MoveDealDto,
  ) {
    return this.dealsService.move(organization.id, id, dto, user.organizationMemberId!);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN, Role.MANAGER)
  @Patch(':id/assign')
  assign(
    @CurrentOrganization() organization: any,
    @GetUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: AssignDealDto,
  ) {
    return this.dealsService.assign(organization.id, id, dto, user.organizationMemberId ?? undefined);
  }

  @Delete(':id')
  remove(@CurrentOrganization() organization: any, @Param('id') id: string) {
    return this.dealsService.remove(organization.id, id);
  }
}
