import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateActivityDto, UpdateActivityDto, FilterActivitiesDto } from './dto';
import { Prisma, DealEventType } from '@prisma/client';

@Injectable()
export class ActivitiesService {
  constructor(private prisma: PrismaService) {}

  async create(organizationId: string, memberId: string, dto: CreateActivityDto) {
    if (!dto.dealId && !dto.leadId) {
      throw new BadRequestException('dealId ou leadId e obrigatorio');
    }

    if (dto.dealId) {
      const deal = await this.prisma.deal.findFirst({
        where: { id: dto.dealId, organizationId },
      });
      if (!deal) throw new NotFoundException('Deal nao encontrado');
    }

    if (dto.leadId) {
      const lead = await this.prisma.lead.findFirst({
        where: { id: dto.leadId, organizationId },
      });
      if (!lead) throw new NotFoundException('Lead nao encontrado');
    }

    const activity = await this.prisma.activity.create({
      data: {
        type: dto.type,
        title: dto.title,
        description: dto.description,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        dealId: dto.dealId,
        leadId: dto.leadId,
        createdById: memberId,
        assignedToId: dto.assignedToId,
        organizationId,
      },
      include: {
        createdBy: {
          include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
        },
        assignedTo: {
          include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
        },
        deal: { select: { id: true, title: true } },
        lead: { select: { id: true, name: true, phone: true } },
      },
    });

    if (dto.dealId) {
      await this.prisma.deal.update({
        where: { id: dto.dealId },
        data: { lastActivityAt: new Date() },
      });
      await this.prisma.dealEvent.create({
        data: {
          dealId: dto.dealId,
          type: DealEventType.ACTIVITY_ADDED,
          data: { activityId: activity.id, type: dto.type, title: dto.title },
          userId: memberId,
        },
      });
    }

    return activity;
  }

  async findAll(organizationId: string, filters: FilterActivitiesDto) {
    const { type, dealId, leadId, assignedToId, createdById, completed,
            dueDateFrom, dueDateTo, search, page = 1, limit = 20,
            sortBy = 'createdAt', sortOrder = 'desc' } = filters;

    const where: Prisma.ActivityWhereInput = { organizationId };

    if (type) where.type = type;
    if (dealId) where.dealId = dealId;
    if (leadId) where.leadId = leadId;
    if (assignedToId) where.assignedToId = assignedToId;
    if (createdById) where.createdById = createdById;
    if (completed !== undefined) where.completedAt = completed ? { not: null } : null;

    if (dueDateFrom || dueDateTo) {
      where.dueDate = {};
      if (dueDateFrom) where.dueDate.gte = new Date(dueDateFrom);
      if (dueDateTo) where.dueDate.lte = new Date(dueDateTo);
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.ActivityOrderByWithRelationInput = {};
    const allowed = ['createdAt', 'dueDate', 'completedAt', 'type', 'title'];
    if (allowed.includes(sortBy)) orderBy[sortBy] = sortOrder;
    else orderBy.createdAt = 'desc';

    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      this.prisma.activity.findMany({
        where,
        include: {
          createdBy: { include: { user: { select: { id: true, name: true, email: true, avatar: true } } } },
          assignedTo: { include: { user: { select: { id: true, name: true, email: true, avatar: true } } } },
          deal: { select: { id: true, title: true } },
          lead: { select: { id: true, name: true, phone: true } },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.activity.count({ where }),
    ]);

    return {
      data: activities,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit), hasMore: skip + activities.length < total },
    };
  }

  async findPending(organizationId: string, memberId?: string) {
    const where: Prisma.ActivityWhereInput = {
      organizationId,
      completedAt: null,
      dueDate: { lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    };
    if (memberId) where.OR = [{ assignedToId: memberId }, { createdById: memberId }];

    return this.prisma.activity.findMany({
      where,
      include: {
        createdBy: { include: { user: { select: { id: true, name: true, email: true, avatar: true } } } },
        assignedTo: { include: { user: { select: { id: true, name: true, email: true, avatar: true } } } },
        deal: { select: { id: true, title: true } },
        lead: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  async findByDeal(organizationId: string, dealId: string) {
    const deal = await this.prisma.deal.findFirst({ where: { id: dealId, organizationId } });
    if (!deal) throw new NotFoundException('Deal nao encontrado');

    return this.prisma.activity.findMany({
      where: { dealId },
      include: {
        createdBy: { include: { user: { select: { id: true, name: true, email: true, avatar: true } } } },
        assignedTo: { include: { user: { select: { id: true, name: true, email: true, avatar: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(organizationId: string, id: string) {
    const activity = await this.prisma.activity.findFirst({
      where: { id, organizationId },
      include: {
        createdBy: { include: { user: { select: { id: true, name: true, email: true, avatar: true } } } },
        assignedTo: { include: { user: { select: { id: true, name: true, email: true, avatar: true } } } },
        deal: { select: { id: true, title: true } },
        lead: { select: { id: true, name: true, phone: true } },
      },
    });
    if (!activity) throw new NotFoundException('Atividade nao encontrada');
    return activity;
  }

  async update(organizationId: string, id: string, dto: UpdateActivityDto) {
    const activity = await this.prisma.activity.findFirst({ where: { id, organizationId } });
    if (!activity) throw new NotFoundException('Atividade nao encontrada');

    return this.prisma.activity.update({
      where: { id },
      data: {
        type: dto.type,
        title: dto.title,
        description: dto.description,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        completedAt: dto.completedAt ? new Date(dto.completedAt) : undefined,
        assignedToId: dto.assignedToId,
      },
      include: {
        createdBy: { include: { user: { select: { id: true, name: true, email: true, avatar: true } } } },
        assignedTo: { include: { user: { select: { id: true, name: true, email: true, avatar: true } } } },
        deal: { select: { id: true, title: true } },
        lead: { select: { id: true, name: true, phone: true } },
      },
    });
  }

  async complete(organizationId: string, id: string) {
    const activity = await this.prisma.activity.findFirst({ where: { id, organizationId } });
    if (!activity) throw new NotFoundException('Atividade nao encontrada');
    return this.prisma.activity.update({ where: { id }, data: { completedAt: new Date() } });
  }

  async remove(organizationId: string, id: string) {
    const activity = await this.prisma.activity.findFirst({ where: { id, organizationId } });
    if (!activity) throw new NotFoundException('Atividade nao encontrada');
    await this.prisma.activity.delete({ where: { id } });
    return { message: 'Atividade removida com sucesso' };
  }
}
