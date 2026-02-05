import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CustomFieldsService } from './custom-fields.service';
import { CreateCustomFieldDto, UpdateCustomFieldDto, SetCustomFieldValueDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentOrganization } from '../common/decorators/current-organization.decorator';
import { Role, CustomFieldEntity } from '@prisma/client';

@Controller('custom-fields')
@UseGuards(JwtAuthGuard)
export class CustomFieldsController {
  constructor(private readonly customFieldsService: CustomFieldsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  create(@CurrentOrganization() org: any, @Body() dto: CreateCustomFieldDto) {
    return this.customFieldsService.create(org.id, dto);
  }

  @Get()
  findAll(@CurrentOrganization() org: any, @Query('entity') entity?: CustomFieldEntity) {
    return this.customFieldsService.findAll(org.id, entity);
  }

  @Get(':id')
  findOne(@CurrentOrganization() org: any, @Param('id') id: string) {
    return this.customFieldsService.findOne(org.id, id);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  update(@CurrentOrganization() org: any, @Param('id') id: string, @Body() dto: UpdateCustomFieldDto) {
    return this.customFieldsService.update(org.id, id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  remove(@CurrentOrganization() org: any, @Param('id') id: string) {
    return this.customFieldsService.remove(org.id, id);
  }

  @Post('values/:entityId')
  setValues(
    @CurrentOrganization() org: any,
    @Param('entityId') entityId: string,
    @Body() values: SetCustomFieldValueDto[],
  ) {
    return this.customFieldsService.setValues(org.id, entityId, values);
  }

  @Get('values/:entityId')
  getValues(@CurrentOrganization() org: any, @Param('entityId') entityId: string) {
    return this.customFieldsService.getValues(org.id, entityId);
  }
}
