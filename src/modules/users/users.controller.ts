import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import {
  AcceptInviteDto,
  InviteUserDto,
  UpdateMemberRoleDto,
  UpdateUserDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import type { JwtPayload } from '../../common/decorators/get-user.decorator';
import { CurrentOrganization } from '../../common/decorators/current-organization.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '@prisma/client';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@GetUser() user: JwtPayload) {
    return this.usersService.getMe(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateMe(@GetUser() user: JwtPayload, @Body() dto: UpdateUserDto) {
    return this.usersService.updateProfile(user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  getMembers(
    @CurrentOrganization() organization: any,
    @Query('role') role?: Role,
    @Query('search') search?: string,
  ) {
    return this.usersService.getMembersByOrganization(organization.id, { role, search });
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  getMember(@CurrentOrganization() organization: any, @Param('id') id: string) {
    return this.usersService.getMemberById(organization.id, id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @Patch(':id/role')
  updateRole(
    @CurrentOrganization() organization: any,
    @GetUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.usersService.updateMemberRole(organization.id, id, dto.role, user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @Delete(':id')
  removeMember(
    @CurrentOrganization() organization: any,
    @GetUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.usersService.removeMember(organization.id, id, user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN, Role.MANAGER)
  @Post('invite')
  invite(
    @CurrentOrganization() organization: any,
    @GetUser() user: JwtPayload,
    @Body() dto: InviteUserDto,
  ) {
    return this.usersService.inviteUser(organization.id, dto, user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @Get('invites')
  getInvites(@CurrentOrganization() organization: any) {
    return this.usersService.getInvites(organization.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @Delete('invites/:id')
  cancelInvite(@Param('id') id: string) {
    return this.usersService.cancelInvite(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @Post('invites/resend/:id')
  resendInvite(@Param('id') id: string) {
    return this.usersService.resendInvite(id);
  }

  @Post('invites/accept')
  acceptInvite(@Body() dto: AcceptInviteDto) {
    return this.usersService.acceptInvite(dto.token, dto);
  }
}
