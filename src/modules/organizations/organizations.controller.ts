import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto, UpdateOrganizationDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import type { JwtPayload } from '../../common/decorators/get-user.decorator';
import { CurrentOrganization } from '../../common/decorators/current-organization.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '@prisma/client';

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  findAll(@GetUser() user: JwtPayload) {
    return this.organizationsService.findAllByUser(user.sub);
  }

  @Post()
  create(@GetUser() user: JwtPayload, @Body() dto: CreateOrganizationDto) {
    return this.organizationsService.create(user.sub, dto);
  }

  @Get('current')
  getCurrent(@CurrentOrganization() organization: any) {
    return organization;
  }

  @Patch('current')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  updateCurrent(
    @CurrentOrganization() organization: any,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.update(organization.id, dto);
  }

  @Delete('current')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER)
  deleteCurrent(@CurrentOrganization() organization: any) {
    return this.organizationsService.delete(organization.id);
  }

  @Get('current/stats')
  getStats(@CurrentOrganization() organization: any) {
    return this.organizationsService.getStats(organization.id);
  }

  @Post('switch/:organizationId')
  switchOrganization(
    @GetUser() user: JwtPayload,
    @Param('organizationId') organizationId: string,
  ) {
    return this.organizationsService.switchOrganization(user.sub, organizationId);
  }
}
