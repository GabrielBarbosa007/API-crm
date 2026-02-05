import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrganizationDto, OrganizationStatsDto, UpdateOrganizationDto } from './dto';
import { Prisma, Role } from '@prisma/client';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  async findAllByUser(userId: string) {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId, isActive: true },
      include: {
        organization: {
          include: {
            plan: true,
          },
        },
      },
    });

    return memberships.map((membership) => ({
      ...membership.organization,
      role: membership.role,
    }));
  }

  async findById(id: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      include: { plan: true },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  async findBySlug(slug: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { slug },
      include: { plan: true },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  async create(userId: string, dto: CreateOrganizationDto) {
    const slug = dto.slug ? dto.slug : await this.generateUniqueSlug(dto.name);
    const plan = await this.getDefaultPlan();

    const organization = await this.prisma.organization.create({
      data: {
        name: dto.name,
        slug,
        planId: plan.id,
        members: {
          create: {
            userId,
            role: Role.OWNER,
          },
        },
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { activeOrganizationId: organization.id },
    });

    return organization;
  }

  async update(orgId: string, dto: UpdateOrganizationDto) {
    return this.prisma.organization.update({
      where: { id: orgId },
      data: {
        name: dto.name,
        logo: dto.logo,
        settings: dto.settings as Prisma.InputJsonValue,
      },
    });
  }

  async delete(orgId: string) {
    return this.prisma.organization.delete({
      where: { id: orgId },
    });
  }

  async getStats(orgId: string): Promise<OrganizationStatsDto> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: { plan: true },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const [totalMembers, totalDeals, totalLeads, totalContacts, totalPipelines] =
      await this.prisma.$transaction([
        this.prisma.organizationMember.count({
          where: { organizationId: orgId, isActive: true },
        }),
        this.prisma.deal.count({ where: { organizationId: orgId } }),
        this.prisma.lead.count({ where: { organizationId: orgId } }),
        this.prisma.contact.count({ where: { organizationId: orgId } }),
        this.prisma.pipeline.count({ where: { organizationId: orgId } }),
      ]);

    const limits = {
      maxUsers: organization.plan.maxUsers,
      maxDeals: organization.plan.maxDeals,
      maxPipelines: organization.plan.maxPipelines,
      maxContacts: organization.plan.maxContacts,
      maxAutomations: organization.plan.maxAutomations,
    };

    const usage = {
      usersPercentage: this.calculateUsage(totalMembers, limits.maxUsers),
      dealsPercentage: this.calculateUsage(totalDeals, limits.maxDeals),
      pipelinesPercentage: this.calculateUsage(totalPipelines, limits.maxPipelines),
      contactsPercentage: this.calculateUsage(totalContacts, limits.maxContacts),
      automationsPercentage: this.calculateUsage(0, limits.maxAutomations),
    };

    return {
      totalMembers,
      totalDeals,
      totalLeads,
      totalContacts,
      totalPipelines,
      limits,
      usage,
    };
  }

  async switchOrganization(userId: string, orgId: string) {
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: { userId, organizationId: orgId },
      },
    });

    if (!membership || !membership.isActive) {
      throw new ForbiddenException('User is not a member of this organization');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { activeOrganizationId: orgId },
    });

    return this.findById(orgId);
  }

  async checkLimit(orgId: string, resource: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: { plan: true },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const limits = organization.plan;
    const currentUsage = await this.getResourceCount(orgId, resource);

    const limitValue = this.getLimitValue(limits, resource);
    if (limitValue === -1) return true;

    if (currentUsage >= limitValue) {
      throw new BadRequestException(`Limit reached for resource: ${resource}`);
    }

    return true;
  }

  async generateUniqueSlug(name: string) {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
      .slice(0, 50);

    if (!base) {
      throw new BadRequestException('Invalid organization name');
    }

    let slug = base;
    let counter = 1;

    while (await this.prisma.organization.findUnique({ where: { slug } })) {
      slug = `${base}-${counter}`;
      counter += 1;
    }

    return slug;
  }

  private async getDefaultPlan() {
    let plan = await this.prisma.plan.findUnique({
      where: { name: 'start' },
    });

    if (!plan) {
      plan = await this.prisma.plan.create({
        data: {
          name: 'start',
          displayName: 'Start',
          price: '0',
          maxUsers: 2,
          maxDeals: 50,
          maxPipelines: 1,
          maxContacts: 500,
          maxAutomations: 5,
          features: ['basic_crm'],
        },
      });
    }

    return plan;
  }

  private calculateUsage(current: number, limit: number) {
    if (limit <= 0) {
      return 0;
    }

    return Math.min(100, Math.round((current / limit) * 100));
  }

  private async getResourceCount(orgId: string, resource: string) {
    switch (resource) {
      case 'users':
        return this.prisma.organizationMember.count({
          where: { organizationId: orgId, isActive: true },
        });
      case 'deals':
        return this.prisma.deal.count({ where: { organizationId: orgId } });
      case 'leads':
        return this.prisma.lead.count({ where: { organizationId: orgId } });
      case 'contacts':
        return this.prisma.contact.count({ where: { organizationId: orgId } });
      case 'pipelines':
        return this.prisma.pipeline.count({ where: { organizationId: orgId } });
      default:
        return 0;
    }
  }

  private getLimitValue(plan: {
    maxUsers: number;
    maxDeals: number;
    maxPipelines: number;
    maxContacts: number;
    maxAutomations: number;
  }, resource: string) {
    switch (resource) {
      case 'users':
        return plan.maxUsers;
      case 'deals':
        return plan.maxDeals;
      case 'pipelines':
        return plan.maxPipelines;
      case 'contacts':
        return plan.maxContacts;
      case 'automations':
        return plan.maxAutomations;
      default:
        return -1;
    }
  }
}
