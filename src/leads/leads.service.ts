import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeadDto, UpdateLeadDto, FilterLeadsDto, AssignLeadDto } from './dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService) {}

  async create(organizationId: string, workspaceId: string, dto: CreateLeadDto) {
    // Verificar duplicação por telefone
    const existingByPhone = await this.prisma.lead.findUnique({
      where: {
        phone_organizationId: {
          phone: dto.phone,
          organizationId,
        },
      },
    });

    if (existingByPhone) {
      throw new ConflictException('Já existe um lead com este telefone');
    }

    // Verificar duplicação por email (se fornecido)
    if (dto.email) {
      const existingByEmail = await this.prisma.lead.findUnique({
        where: {
          email_organizationId: {
            email: dto.email,
            organizationId,
          },
        },
      });

      if (existingByEmail) {
        throw new ConflictException('Já existe um lead com este email');
      }
    }

    // Validar assignedToId se fornecido
    if (dto.assignedToId) {
      const member = await this.prisma.organizationMember.findFirst({
        where: {
          id: dto.assignedToId,
          organizationId,
          isActive: true,
        },
      });

      if (!member) {
        throw new BadRequestException('Membro da organização não encontrado');
      }
    }

    return this.prisma.lead.create({
      data: {
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        temperature: dto.temperature,
        status: dto.status,
        priority: dto.priority,
        source: dto.source,
        notes: dto.notes,
        assignedToId: dto.assignedToId,
        organizationId,
        workspaceId,
      },
      include: {
        assignedTo: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
      },
    });
  }

  async findAll(organizationId: string, filters: FilterLeadsDto) {
    const {
      search,
      name,
      phone,
      email,
      temperature,
      status,
      priority,
      source,
      assignedToId,
      createdFrom,
      createdTo,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    const where: Prisma.LeadWhereInput = {
      organizationId,
    };

    // Busca geral
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Filtros específicos
    if (name) {
      where.name = { contains: name, mode: 'insensitive' };
    }

    if (phone) {
      where.phone = { contains: phone, mode: 'insensitive' };
    }

    if (email) {
      where.email = { contains: email, mode: 'insensitive' };
    }

    if (temperature) {
      where.temperature = temperature;
    }

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (source) {
      where.source = source;
    }

    if (assignedToId) {
      where.assignedToId = assignedToId;
    }

    // Filtro por data
    if (createdFrom || createdTo) {
      where.createdAt = {};
      if (createdFrom) {
        where.createdAt.gte = new Date(createdFrom);
      }
      if (createdTo) {
        where.createdAt.lte = new Date(createdTo);
      }
    }

    // Ordenação
    const orderBy: Prisma.LeadOrderByWithRelationInput = {};
    const allowedSortFields = ['createdAt', 'updatedAt', 'name', 'temperature', 'status', 'priority'];
    
    if (allowedSortFields.includes(sortBy)) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.createdAt = 'desc';
    }

    // Paginação
    const skip = (page - 1) * limit;
    const take = limit;

    const [leads, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        include: {
          assignedTo: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                },
              },
            },
          },
          _count: {
            select: {
              deals: true,
            },
          },
        },
        orderBy,
        skip,
        take,
      }),
      this.prisma.lead.count({ where }),
    ]);

    return {
      data: leads,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + leads.length < total,
      },
    };
  }

  async findOne(organizationId: string, id: string) {
    const lead = await this.prisma.lead.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        assignedTo: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
        deals: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        conversation: {
          include: {
            messages: {
              take: 10,
              orderBy: {
                createdAt: 'desc',
              },
            },
          },
        },
      },
    });

    if (!lead) {
      throw new NotFoundException('Lead não encontrado');
    }

    return lead;
  }

  async update(organizationId: string, id: string, dto: UpdateLeadDto) {
    const lead = await this.prisma.lead.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!lead) {
      throw new NotFoundException('Lead não encontrado');
    }

    // Verificar duplicação de telefone (se alterado)
    if (dto.phone && dto.phone !== lead.phone) {
      const existingByPhone = await this.prisma.lead.findFirst({
        where: {
          phone: dto.phone,
          organizationId,
          id: { not: id },
        },
      });

      if (existingByPhone) {
        throw new ConflictException('Já existe um lead com este telefone');
      }
    }

    // Verificar duplicação de email (se alterado)
    if (dto.email && dto.email !== lead.email) {
      const existingByEmail = await this.prisma.lead.findFirst({
        where: {
          email: dto.email,
          organizationId,
          id: { not: id },
        },
      });

      if (existingByEmail) {
        throw new ConflictException('Já existe um lead com este email');
      }
    }

    // Validar assignedToId se fornecido
    if (dto.assignedToId) {
      const member = await this.prisma.organizationMember.findFirst({
        where: {
          id: dto.assignedToId,
          organizationId,
          isActive: true,
        },
      });

      if (!member) {
        throw new BadRequestException('Membro da organização não encontrado');
      }
    }

    return this.prisma.lead.update({
      where: { id },
      data: dto,
      include: {
        assignedTo: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
      },
    });
  }

  async remove(organizationId: string, id: string) {
    const lead = await this.prisma.lead.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!lead) {
      throw new NotFoundException('Lead não encontrado');
    }

    await this.prisma.lead.delete({
      where: { id },
    });

    return { message: 'Lead removido com sucesso' };
  }

  async assign(organizationId: string, id: string, dto: AssignLeadDto) {
    const lead = await this.prisma.lead.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!lead) {
      throw new NotFoundException('Lead não encontrado');
    }

    // Validar assignedToId se fornecido
    if (dto.assignedToId) {
      const member = await this.prisma.organizationMember.findFirst({
        where: {
          id: dto.assignedToId,
          organizationId,
          isActive: true,
        },
      });

      if (!member) {
        throw new BadRequestException('Membro da organização não encontrado');
      }
    }

    return this.prisma.lead.update({
      where: { id },
      data: {
        assignedToId: dto.assignedToId || null,
      },
      include: {
        assignedTo: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
      },
    });
  }

  async getStats(organizationId: string) {
    const [
      total,
      byStatus,
      byTemperature,
      byPriority,
      bySource,
      recentLeads,
    ] = await Promise.all([
      this.prisma.lead.count({ where: { organizationId } }),
      this.prisma.lead.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: true,
      }),
      this.prisma.lead.groupBy({
        by: ['temperature'],
        where: { organizationId },
        _count: true,
      }),
      this.prisma.lead.groupBy({
        by: ['priority'],
        where: { organizationId },
        _count: true,
      }),
      this.prisma.lead.groupBy({
        by: ['source'],
        where: { organizationId },
        _count: true,
      }),
      this.prisma.lead.count({
        where: {
          organizationId,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    return {
      total,
      recentLeads,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {}),
      byTemperature: byTemperature.reduce((acc, item) => {
        acc[item.temperature] = item._count;
        return acc;
      }, {}),
      byPriority: byPriority.reduce((acc, item) => {
        acc[item.priority] = item._count;
        return acc;
      }, {}),
      bySource: bySource.reduce((acc, item) => {
        acc[item.source] = item._count;
        return acc;
      }, {}),
    };
  }
}
