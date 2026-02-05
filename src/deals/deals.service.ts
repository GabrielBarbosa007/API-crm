import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDealDto, UpdateDealDto, FilterDealsDto, AssignDealDto, MoveDealDto } from './dto';
import { Prisma, DealEventType } from '@prisma/client';

@Injectable()
export class DealsService {
  constructor(private prisma: PrismaService) {}

  async create(organizationId: string, workspaceId: string, dto: CreateDealDto, memberId?: string) {
    const lead = await this.prisma.lead.findFirst({ where: { id: dto.leadId, organizationId } });
    if (!lead) throw new NotFoundException('Lead nao encontrado');

    let pipelineId = dto.pipelineId;
    let stageId = dto.stageId;

    if (!pipelineId) {
      const defaultPipeline = await this.prisma.pipeline.findFirst({
        where: { organizationId, isDefault: true },
        include: { stages: { orderBy: { position: 'asc' }, take: 1 } },
      });
      if (defaultPipeline) {
        pipelineId = defaultPipeline.id;
        if (!stageId && defaultPipeline.stages.length > 0) {
          stageId = defaultPipeline.stages[0].id;
        }
      }
    }

    if (stageId) {
      const stage = await this.prisma.stage.findFirst({ where: { id: stageId, pipelineId } });
      if (!stage) throw new BadRequestException('Estagio nao encontrado no pipeline');
    }

    const deal = await this.prisma.deal.create({
      data: {
        title: dto.title || `Deal - ${lead.name || lead.phone}`,
        value: dto.value,
        notes: dto.notes,
        leadId: dto.leadId,
        pipelineId,
        stageId,
        stageEnteredAt: new Date(),
        assignedToId: dto.assignedToId,
        contactId: dto.contactId,
        companyId: dto.companyId,
        probability: dto.probability ?? 50,
        expectedCloseDate: dto.expectedCloseDate ? new Date(dto.expectedCloseDate) : null,
        organizationId,
        workspaceId,
      },
      include: {
        lead: { select: { id: true, name: true, phone: true, email: true } },
        assignedTo: { include: { user: { select: { id: true, name: true, email: true, avatar: true } } } },
        pipeline: true,
        stage: true,
      },
    });

    if (memberId) {
      await this.prisma.dealEvent.create({
        data: { dealId: deal.id, type: DealEventType.CREATED, data: { title: deal.title }, userId: memberId },
      });
    }

    return deal;
  }

  async findAll(organizationId: string, filters: FilterDealsDto) {
    const { search, leadId, pipelineId, assignedToId, minValue, maxValue, createdFrom, createdTo, closedFrom, closedTo, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = filters;

    const where: Prisma.DealWhereInput = { organizationId };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { lead: { name: { contains: search, mode: 'insensitive' } } },
        { lead: { phone: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (leadId) where.leadId = leadId;
    if (pipelineId) where.pipelineId = pipelineId;
    if (assignedToId) where.assignedToId = assignedToId;

    if (minValue !== undefined || maxValue !== undefined) {
      where.value = {};
      if (minValue !== undefined) where.value.gte = minValue;
      if (maxValue !== undefined) where.value.lte = maxValue;
    }

    if (createdFrom || createdTo) {
      where.createdAt = {};
      if (createdFrom) where.createdAt.gte = new Date(createdFrom);
      if (createdTo) where.createdAt.lte = new Date(createdTo);
    }

    if (closedFrom || closedTo) {
      where.closedAt = {};
      if (closedFrom) where.closedAt.gte = new Date(closedFrom);
      if (closedTo) where.closedAt.lte = new Date(closedTo);
    }

    const orderBy: Prisma.DealOrderByWithRelationInput = {};
    const allowed = ['createdAt', 'updatedAt', 'value', 'closedAt'];
    if (allowed.includes(sortBy)) orderBy[sortBy] = sortOrder;
    else orderBy.createdAt = 'desc';

    const skip = (page - 1) * limit;

    const [deals, total] = await Promise.all([
      this.prisma.deal.findMany({
        where,
        include: {
          lead: { select: { id: true, name: true, phone: true, email: true, temperature: true } },
          assignedTo: { include: { user: { select: { id: true, name: true, email: true, avatar: true } } } },
          pipeline: true,
          stage: true,
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.deal.count({ where }),
    ]);

    return { data: deals, meta: { total, page, limit, totalPages: Math.ceil(total / limit), hasMore: skip + deals.length < total } };
  }

  async findOne(organizationId: string, id: string) {
    const deal = await this.prisma.deal.findFirst({
      where: { id, organizationId },
      include: {
        lead: { include: { conversation: { include: { messages: { take: 5, orderBy: { createdAt: 'desc' } } } } } },
        assignedTo: { include: { user: { select: { id: true, name: true, email: true, avatar: true } } } },
        pipeline: { include: { stages: { orderBy: { position: 'asc' } } } },
        stage: true,
        contact: true,
        company: true,
        lostReason: true,
        products: { include: { product: true } },
        activities: { take: 5, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!deal) throw new NotFoundException('Deal nao encontrado');
    return deal;
  }

  async update(organizationId: string, id: string, dto: UpdateDealDto) {
    const deal = await this.prisma.deal.findFirst({ where: { id, organizationId } });
    if (!deal) throw new NotFoundException('Deal nao encontrado');

    return this.prisma.deal.update({
      where: { id },
      data: dto,
      include: {
        lead: { select: { id: true, name: true, phone: true, email: true } },
        assignedTo: { include: { user: { select: { id: true, name: true, email: true, avatar: true } } } },
        pipeline: true,
        stage: true,
      },
    });
  }

  async remove(organizationId: string, id: string) {
    const deal = await this.prisma.deal.findFirst({ where: { id, organizationId } });
    if (!deal) throw new NotFoundException('Deal nao encontrado');
    await this.prisma.deal.delete({ where: { id } });
    return { message: 'Deal removido com sucesso' };
  }

  async move(organizationId: string, id: string, dto: MoveDealDto, memberId: string) {
    const deal = await this.prisma.deal.findFirst({ where: { id, organizationId } });
    if (!deal) throw new NotFoundException('Deal nao encontrado');

    const stage = await this.prisma.stage.findFirst({
      where: { id: dto.stageId },
      include: { pipeline: true },
    });
    if (!stage || stage.pipeline.organizationId !== organizationId) {
      throw new BadRequestException('Estagio nao encontrado');
    }

    const oldStageId = deal.stageId;
    const data: any = {
      stageId: dto.stageId,
      pipelineId: stage.pipelineId,
      stageEnteredAt: new Date(),
    };

    if (stage.isWon) {
      data.closedAt = new Date();
    } else if (stage.isLost) {
      data.closedAt = new Date();
      if (dto.lostReasonId) data.lostReasonId = dto.lostReasonId;
    } else if (deal.closedAt) {
      data.closedAt = null;
      data.lostReasonId = null;
    }

    const updated = await this.prisma.deal.update({
      where: { id },
      data,
      include: {
        lead: { select: { id: true, name: true, phone: true, email: true } },
        pipeline: true,
        stage: true,
      },
    });

    const eventType = stage.isWon ? DealEventType.WON : stage.isLost ? DealEventType.LOST : DealEventType.STAGE_CHANGED;
    await this.prisma.dealEvent.create({
      data: {
        dealId: id,
        type: eventType,
        data: { fromStageId: oldStageId, toStageId: dto.stageId, stageName: stage.name, notes: dto.notes },
        userId: memberId,
      },
    });

    return updated;
  }

  async assign(organizationId: string, id: string, dto: AssignDealDto, memberId?: string) {
    const deal = await this.prisma.deal.findFirst({ where: { id, organizationId } });
    if (!deal) throw new NotFoundException('Deal nao encontrado');

    if (dto.assignedToId) {
      const member = await this.prisma.organizationMember.findFirst({ where: { id: dto.assignedToId, organizationId, isActive: true } });
      if (!member) throw new BadRequestException('Membro nao encontrado');
    }

    const updated = await this.prisma.deal.update({
      where: { id },
      data: { assignedToId: dto.assignedToId || null },
      include: { assignedTo: { include: { user: { select: { id: true, name: true, email: true, avatar: true } } } } },
    });

    if (memberId) {
      await this.prisma.dealEvent.create({
        data: { dealId: id, type: DealEventType.ASSIGNED, data: { assignedToId: dto.assignedToId }, userId: memberId },
      });
    }

    return updated;
  }

  async getStats(organizationId: string) {
    const [total, byStage, totalValue, wonValue, recentDeals, avgValue] = await Promise.all([
      this.prisma.deal.count({ where: { organizationId } }),
      this.prisma.deal.groupBy({ by: ['stageId'], where: { organizationId }, _count: true, _sum: { value: true } }),
      this.prisma.deal.aggregate({ where: { organizationId }, _sum: { value: true } }),
      this.prisma.deal.aggregate({ where: { organizationId, stage: { isWon: true } }, _sum: { value: true } }),
      this.prisma.deal.count({ where: { organizationId, createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
      this.prisma.deal.aggregate({ where: { organizationId }, _avg: { value: true } }),
    ]);

    return {
      total,
      recentDeals,
      totalValue: totalValue._sum.value || 0,
      wonValue: wonValue._sum.value || 0,
      avgDealValue: avgValue._avg.value || 0,
      byStage,
    };
  }

  async getForecast(organizationId: string) {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const thisQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    const nextQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 1);

    const [openDeals, monthlyForecast, quarterlyForecast, wonThisMonth, lostThisMonth] = await Promise.all([
      this.prisma.deal.aggregate({
        where: { organizationId, closedAt: null },
        _sum: { value: true },
        _count: true,
      }),
      this.prisma.deal.aggregate({
        where: { organizationId, expectedCloseDate: { gte: thisMonth, lt: nextMonth }, closedAt: null },
        _sum: { value: true },
        _count: true,
      }),
      this.prisma.deal.aggregate({
        where: { organizationId, expectedCloseDate: { gte: thisQuarter, lt: nextQuarter }, closedAt: null },
        _sum: { value: true },
        _count: true,
      }),
      this.prisma.deal.aggregate({
        where: { organizationId, closedAt: { gte: thisMonth }, stage: { isWon: true } },
        _sum: { value: true },
        _count: true,
      }),
      this.prisma.deal.aggregate({
        where: { organizationId, closedAt: { gte: thisMonth }, stage: { isLost: true } },
        _count: true,
      }),
    ]);

    const winRate = wonThisMonth._count && (wonThisMonth._count + lostThisMonth._count) > 0
      ? (wonThisMonth._count / (wonThisMonth._count + lostThisMonth._count)) * 100 : 0;

    return {
      openDeals: { count: openDeals._count, value: openDeals._sum.value || 0 },
      monthlyForecast: { count: monthlyForecast._count, value: monthlyForecast._sum.value || 0 },
      quarterlyForecast: { count: quarterlyForecast._count, value: quarterlyForecast._sum.value || 0 },
      wonThisMonth: { count: wonThisMonth._count, value: wonThisMonth._sum.value || 0 },
      winRate: Math.round(winRate),
    };
  }

  async getHistory(organizationId: string, id: string) {
    const deal = await this.prisma.deal.findFirst({ where: { id, organizationId } });
    if (!deal) throw new NotFoundException('Deal nao encontrado');

    return this.prisma.dealEvent.findMany({
      where: { dealId: id },
      include: { user: { include: { user: { select: { id: true, name: true, avatar: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getByLead(organizationId: string, leadId: string) {
    return this.prisma.deal.findMany({
      where: { organizationId, leadId },
      include: {
        assignedTo: { include: { user: { select: { id: true, name: true, email: true, avatar: true } } } },
        pipeline: true,
        stage: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getByPipeline(organizationId: string, pipelineId: string) {
    const pipeline = await this.prisma.pipeline.findFirst({
      where: { id: pipelineId, organizationId },
      include: { stages: { orderBy: { position: 'asc' } } },
    });
    if (!pipeline) throw new NotFoundException('Pipeline nao encontrado');

    const deals = await this.prisma.deal.findMany({
      where: { pipelineId },
      include: {
        lead: { select: { id: true, name: true, phone: true } },
        assignedTo: { include: { user: { select: { id: true, name: true, avatar: true } } } },
        stage: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const grouped = pipeline.stages.map(stage => ({
      ...stage,
      deals: deals.filter(d => d.stageId === stage.id),
    }));

    return { pipeline, stages: grouped };
  }
}
