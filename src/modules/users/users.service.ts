import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AcceptInviteDto, InviteUserDto, UpdateMemberRoleDto, UpdateUserDto } from './dto';
import { OrganizationsService } from '../organizations/organizations.service';
import { InviteStatus, Role } from '@prisma/client';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private organizationsService: OrganizationsService,
  ) {}

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        activeOrganizationId: true,
        memberships: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateProfile(userId: string, dto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        name: dto.name,
        avatar: dto.avatar,
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
      },
    });
  }

  async getMembersByOrganization(orgId: string, filters?: { role?: Role; search?: string }) {
    const where: any = {
      organizationId: orgId,
      isActive: true,
    };

    if (filters?.role) {
      where.role = filters.role;
    }

    if (filters?.search) {
      where.user = {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } },
        ],
      };
    }

    const memberships = await this.prisma.organizationMember.findMany({
      where,
      include: {
        user: true,
      },
    });

    return memberships.map((membership) => ({
      id: membership.user.id,
      name: membership.user.name,
      email: membership.user.email,
      role: membership.role,
      joinedAt: membership.joinedAt,
      isActive: membership.isActive,
    }));
  }

  async getMemberById(orgId: string, userId: string) {
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: { userId, organizationId: orgId },
      },
      include: { user: true },
    });

    if (!membership || !membership.isActive) {
      throw new NotFoundException('Member not found');
    }

    return {
      id: membership.user.id,
      name: membership.user.name,
      email: membership.user.email,
      role: membership.role,
      joinedAt: membership.joinedAt,
      isActive: membership.isActive,
    };
  }

  async updateMemberRole(
    orgId: string,
    userId: string,
    role: Role,
    requesterId: string,
  ) {
    if (userId === requesterId) {
      throw new BadRequestException('You cannot change your own role');
    }

    const membership = await this.prisma.organizationMember.findUnique({
      where: { userId_organizationId: { userId, organizationId: orgId } },
    });

    if (!membership) {
      throw new NotFoundException('Member not found');
    }

    if (membership.role === Role.OWNER) {
      throw new ForbiddenException('Cannot change OWNER role');
    }

    return this.prisma.organizationMember.update({
      where: { userId_organizationId: { userId, organizationId: orgId } },
      data: { role },
    });
  }

  async removeMember(orgId: string, userId: string, requesterId: string) {
    if (userId === requesterId) {
      throw new BadRequestException('You cannot remove yourself');
    }

    const membership = await this.prisma.organizationMember.findUnique({
      where: { userId_organizationId: { userId, organizationId: orgId } },
    });

    if (!membership) {
      throw new NotFoundException('Member not found');
    }

    if (membership.role === Role.OWNER) {
      throw new ForbiddenException('Cannot remove OWNER');
    }

    return this.prisma.organizationMember.update({
      where: { userId_organizationId: { userId, organizationId: orgId } },
      data: { isActive: false },
    });
  }

  async inviteUser(orgId: string, dto: InviteUserDto, inviterId: string) {
    await this.organizationsService.checkLimit(orgId, 'users');

    const existingInvite = await this.prisma.organizationInvite.findUnique({
      where: { organizationId_email: { organizationId: orgId, email: dto.email } },
    });

    if (existingInvite && existingInvite.status === InviteStatus.PENDING) {
      throw new ConflictException('Invite already exists');
    }

    const existingMember = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId: orgId,
        user: { email: dto.email },
        isActive: true,
      },
    });

    if (existingMember) {
      throw new ConflictException('User is already a member');
    }

    const token = this.generateInviteToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    return this.prisma.organizationInvite.create({
      data: {
        organizationId: orgId,
        email: dto.email,
        role: dto.role ?? Role.MEMBER,
        token,
        invitedById: inviterId,
        expiresAt,
      },
    });
  }

  async getInvites(orgId: string) {
    return this.prisma.organizationInvite.findMany({
      where: { organizationId: orgId, status: InviteStatus.PENDING },
      orderBy: { createdAt: 'desc' },
    });
  }

  async cancelInvite(inviteId: string) {
    return this.prisma.organizationInvite.update({
      where: { id: inviteId },
      data: { status: InviteStatus.CANCELLED },
    });
  }

  async resendInvite(inviteId: string) {
    const token = this.generateInviteToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    return this.prisma.organizationInvite.update({
      where: { id: inviteId },
      data: {
        token,
        expiresAt,
        status: InviteStatus.PENDING,
      },
    });
  }

  async acceptInvite(token: string, dto: AcceptInviteDto) {
    const invite = await this.validateInviteToken(token);

    if (!invite) {
      throw new BadRequestException('Invalid or expired invite');
    }

    let user = await this.prisma.user.findUnique({
      where: { email: invite.email },
    });

    if (!user) {
      if (!dto.password) {
        throw new BadRequestException('Password is required for new users');
      }

      const hashedPassword = await bcrypt.hash(dto.password, 10);
      const name = dto.name ?? invite.email.split('@')[0];

      const workspace = await this.prisma.workspace.create({
        data: { name: `${name}'s Workspace` },
      });

      user = await this.prisma.user.create({
        data: {
          name,
          email: invite.email,
          passwordHash: hashedPassword,
          workspaceId: workspace.id,
        },
      });
    }

    await this.prisma.organizationMember.create({
      data: {
        organizationId: invite.organizationId,
        userId: user.id,
        role: invite.role,
      },
    });

    await this.prisma.organizationInvite.update({
      where: { id: invite.id },
      data: { status: InviteStatus.ACCEPTED, acceptedAt: new Date() },
    });

    if (!user.activeOrganizationId) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { activeOrganizationId: invite.organizationId },
      });
    }

    return { message: 'Invite accepted' };
  }

  generateInviteToken() {
    return randomBytes(32).toString('hex');
  }

  async validateInviteToken(token: string) {
    const now = new Date();

    const invite = await this.prisma.organizationInvite.findUnique({
      where: { token },
    });

    if (!invite) {
      return null;
    }

    if (invite.expiresAt < now) {
      await this.prisma.organizationInvite.update({
        where: { id: invite.id },
        data: { status: InviteStatus.EXPIRED },
      });
      return null;
    }

    if (invite.status !== InviteStatus.PENDING) {
      return null;
    }

    return invite;
  }
}
