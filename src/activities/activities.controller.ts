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
import { ActivitiesService } from './activities.service';
import { CreateActivityDto, UpdateActivityDto, FilterActivitiesDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentOrganization } from '../common/decorators/current-organization.decorator';
import { GetUser } from '../common/decorators/get-user.decorator';
import type { JwtPayload } from '../common/decorators/get-user.decorator';

@Controller()
@UseGuards(JwtAuthGuard)
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Post('activities')
  create(
    @CurrentOrganization() organization: any,
    @GetUser() user: JwtPayload,
    @Body() dto: CreateActivityDto,
  ) {
    return this.activitiesService.create(organization.id, user.organizationMemberId!, dto);
  }

  @Get('activities')
  findAll(
    @CurrentOrganization() organization: any,
    @Query() filters: FilterActivitiesDto,
  ) {
    return this.activitiesService.findAll(organization.id, filters);
  }

  @Get('activities/pending')
  findPending(
    @CurrentOrganization() organization: any,
    @GetUser() user: JwtPayload,
  ) {
    return this.activitiesService.findPending(organization.id, user.organizationMemberId ?? undefined);
  }

  @Get('activities/:id')
  findOne(
    @CurrentOrganization() organization: any,
    @Param('id') id: string,
  ) {
    return this.activitiesService.findOne(organization.id, id);
  }

  @Put('activities/:id')
  update(
    @CurrentOrganization() organization: any,
    @Param('id') id: string,
    @Body() dto: UpdateActivityDto,
  ) {
    return this.activitiesService.update(organization.id, id, dto);
  }

  @Patch('activities/:id/complete')
  complete(
    @CurrentOrganization() organization: any,
    @Param('id') id: string,
  ) {
    return this.activitiesService.complete(organization.id, id);
  }

  @Delete('activities/:id')
  remove(
    @CurrentOrganization() organization: any,
    @Param('id') id: string,
  ) {
    return this.activitiesService.remove(organization.id, id);
  }

  // Deal-specific activities endpoints
  @Post('deals/:dealId/activities')
  createForDeal(
    @CurrentOrganization() organization: any,
    @GetUser() user: JwtPayload,
    @Param('dealId') dealId: string,
    @Body() dto: CreateActivityDto,
  ) {
    return this.activitiesService.create(organization.id, user.organizationMemberId!, {
      ...dto,
      dealId,
    });
  }

  @Get('deals/:dealId/activities')
  findByDeal(
    @CurrentOrganization() organization: any,
    @Param('dealId') dealId: string,
  ) {
    return this.activitiesService.findByDeal(organization.id, dealId);
  }
}
