import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { LeadsService } from './leads.service';
import { CreateLeadDto, UpdateLeadDto, FilterLeadsDto, AssignLeadDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentOrganization } from '../common/decorators/current-organization.decorator';
import { GetUser } from '../common/decorators/get-user.decorator';
import type { JwtPayload } from '../common/decorators/get-user.decorator';
import { Role } from '@prisma/client';

@Controller('leads')
@UseGuards(JwtAuthGuard)
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  create(
    @CurrentOrganization() organization: any,
    @GetUser() user: JwtPayload,
    @Body() dto: CreateLeadDto,
  ) {
    return this.leadsService.create(organization.id, user.workspaceId, dto);
  }

  @Get()
  findAll(
    @CurrentOrganization() organization: any,
    @Query() filters: FilterLeadsDto,
  ) {
    return this.leadsService.findAll(organization.id, filters);
  }

  @Get('stats')
  getStats(@CurrentOrganization() organization: any) {
    return this.leadsService.getStats(organization.id);
  }

  @Get(':id')
  findOne(
    @CurrentOrganization() organization: any,
    @Param('id') id: string,
  ) {
    return this.leadsService.findOne(organization.id, id);
  }

  @Put(':id')
  update(
    @CurrentOrganization() organization: any,
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
  ) {
    return this.leadsService.update(organization.id, id, dto);
  }

  @Patch(':id')
  partialUpdate(
    @CurrentOrganization() organization: any,
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
  ) {
    return this.leadsService.update(organization.id, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentOrganization() organization: any,
    @Param('id') id: string,
  ) {
    return this.leadsService.remove(organization.id, id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN, Role.MANAGER)
  @Patch(':id/assign')
  assign(
    @CurrentOrganization() organization: any,
    @Param('id') id: string,
    @Body() dto: AssignLeadDto,
  ) {
    return this.leadsService.assign(organization.id, id, dto);
  }
}
