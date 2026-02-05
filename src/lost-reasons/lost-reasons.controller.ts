import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { LostReasonsService } from './lost-reasons.service';
import { CreateLostReasonDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentOrganization } from '../common/decorators/current-organization.decorator';
import { Role } from '@prisma/client';

@Controller('lost-reasons')
@UseGuards(JwtAuthGuard)
export class LostReasonsController {
  constructor(private readonly lostReasonsService: LostReasonsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  create(@CurrentOrganization() org: any, @Body() dto: CreateLostReasonDto) {
    return this.lostReasonsService.create(org.id, dto);
  }

  @Get()
  findAll(@CurrentOrganization() org: any) {
    return this.lostReasonsService.findAll(org.id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  remove(@CurrentOrganization() org: any, @Param('id') id: string) {
    return this.lostReasonsService.remove(org.id, id);
  }
}
