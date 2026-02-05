import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePipelineDto, UpdatePipelineDto, CreateStageDto, UpdateStageDto, ReorderStagesDto } from './dto';
import { PipelineVisibility } from '@prisma/client';

@Injectable()
export class PipelinesService {
  constructor(private prisma: PrismaService) {}

  async create(organizationId: string, dto: CreatePipelineDto) {
    if (dto.isDefault) {
      await this.prisma.pipeline.updateMany({
        where: { organizationId, isDefault: true },
        data: { isDefault: false },
      });
    }

    let position = dto.position;
    if (position === undefined) {
      const lastPipeline = await this.prisma.pipeline.findFirst({
        where: { organizationId },
        orderBy: { position: 'desc' },
      });
      position = lastPipeline ? lastPipeline.position + 1 : 0;
    }

    const stages = dto.stages || [
      { name: 'Qualificado', color: '#6366f1', position: 0 },
      { name: 'Proposta Enviada', color: '#8b5cf6', position: 1 },
      { name: 'Negociacao', color: '#f59e0b', position: 2 },
      { name: 'Ganho', color: '#10b981', position: 3, isWon: true },
      { name: 'Perdido', color: '#ef4444', position: 4, isLost: true },
    ];

    return this.prisma.pipeline.create({
      data: {
        name: dto.name,
        isDefault: dto.isDefault ?? false,
        visibility: dto.visibility ?? PipelineVisibility.PUBLIC,
        position,
        organizationId,
        stages: {
          create: stages.map((stage, index) => ({
            name: stage.name,
            color: stage.color ?? '#6366f1',
            position: stage.position ?? index,
            isWon: stage.isWon ?? false,
            isLost: stage.isLost ?? false,
          })),
        },
      },
      include: {
        stages: { orderBy: { position: 'asc' } },
        _count: { select: { deals: true } },
      },
    });
  }

  async findAll(organizationId: string, memberId?: string) {
    return this.prisma.pipeline.findMany({
      where: {
        organizationId,
        OR: [
          { visibility: PipelineVisibility.PUBLIC },
          { members: { some: { memberId } } },
        ],
      },
      include: {
        stages: {
          orderBy: { position: 'asc' },
          include: { _count: { select: { deals: true } } },
        },
        _count: { select: { deals: true } },
      },
      orderBy: { position: 'asc' },
    });
  }

  async findOne(organizationId: string, id: string) {
    const pipeline = await this.prisma.pipeline.findFirst({
      where: { id, organizationId },
      include: {
        stages: {
          orderBy: { position: 'asc' },
          include: { _count: { select: { deals: true } } },
        },
        members: {
          include: {
            member: {
              include: {
                user: { select: { id: true, name: true, email: true, avatar: true } },
              },
            },
          },
        },
        _count: { select: { deals: true } },
      },
    });

    if (!pipeline) {
      throw new NotFoundException('Pipeline nao encontrado');
    }

    return pipeline;
  }

  async update(organizationId: string, id: string, dto: UpdatePipelineDto) {
    const pipeline = await this.prisma.pipeline.findFirst({
      where: { id, organizationId },
    });

    if (!pipeline) {
      throw new NotFoundException('Pipeline nao encontrado');
    }

    if (dto.isDefault) {
      await this.prisma.pipeline.updateMany({
        where: { organizationId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return this.prisma.pipeline.update({
      where: { id },
      data: dto,
      include: {
        stages: { orderBy: { position: 'asc' } },
        _count: { select: { deals: true } },
      },
    });
  }

  async remove(organizationId: string, id: string) {
    const pipeline = await this.prisma.pipeline.findFirst({
      where: { id, organizationId },
      include: { _count: { select: { deals: true } } },
    });

    if (!pipeline) {
      throw new NotFoundException('Pipeline nao encontrado');
    }

    if (pipeline._count.deals > 0) {
      throw new BadRequestException('Nao e possivel excluir pipeline com deals associados');
    }

    await this.prisma.pipeline.delete({ where: { id } });
    return { message: 'Pipeline removido com sucesso' };
  }

  async createStage(organizationId: string, pipelineId: string, dto: CreateStageDto) {
    const pipeline = await this.prisma.pipeline.findFirst({
      where: { id: pipelineId, organizationId },
    });

    if (!pipeline) {
      throw new NotFoundException('Pipeline nao encontrado');
    }

    if (dto.isWon) {
      const existingWon = await this.prisma.stage.findFirst({
        where: { pipelineId, isWon: true },
      });
      if (existingWon) {
        throw new ConflictException('Ja existe um estagio de vitoria neste pipeline');
      }
    }

    if (dto.isLost) {
      const existingLost = await this.prisma.stage.findFirst({
        where: { pipelineId, isLost: true },
      });
      if (existingLost) {
        throw new ConflictException('Ja existe um estagio de perda neste pipeline');
      }
    }

    let position = dto.position;
    if (position === undefined) {
      const lastStage = await this.prisma.stage.findFirst({
        where: { pipelineId },
        orderBy: { position: 'desc' },
      });
      position = lastStage ? lastStage.position + 1 : 0;
    }

    return this.prisma.stage.create({
      data: {
        name: dto.name,
        color: dto.color ?? '#6366f1',
        position,
        isWon: dto.isWon ?? false,
        isLost: dto.isLost ?? false,
        pipelineId,
      },
    });
  }

  async updateStage(organizationId: string, pipelineId: string, stageId: string, dto: UpdateStageDto) {
    const stage = await this.prisma.stage.findFirst({
      where: { id: stageId, pipelineId },
      include: { pipeline: true },
    });

    if (!stage || stage.pipeline.organizationId !== organizationId) {
      throw new NotFoundException('Estagio nao encontrado');
    }

    if (dto.isWon) {
      const existingWon = await this.prisma.stage.findFirst({
        where: { pipelineId, isWon: true, id: { not: stageId } },
      });
      if (existingWon) {
        throw new ConflictException('Ja existe um estagio de vitoria neste pipeline');
      }
    }

    if (dto.isLost) {
      const existingLost = await this.prisma.stage.findFirst({
        where: { pipelineId, isLost: true, id: { not: stageId } },
      });
      if (existingLost) {
        throw new ConflictException('Ja existe um estagio de perda neste pipeline');
      }
    }

    return this.prisma.stage.update({
      where: { id: stageId },
      data: dto,
    });
  }

  async removeStage(organizationId: string, pipelineId: string, stageId: string) {
    const stage = await this.prisma.stage.findFirst({
      where: { id: stageId, pipelineId },
      include: {
        pipeline: true,
        _count: { select: { deals: true } },
      },
    });

    if (!stage || stage.pipeline.organizationId !== organizationId) {
      throw new NotFoundException('Estagio nao encontrado');
    }

    if (stage._count.deals > 0) {
      throw new BadRequestException('Nao e possivel excluir estagio com deals');
    }

    await this.prisma.stage.delete({ where: { id: stageId } });
    return { message: 'Estagio removido com sucesso' };
  }

  async reorderStages(organizationId: string, pipelineId: string, dto: ReorderStagesDto) {
    const pipeline = await this.prisma.pipeline.findFirst({
      where: { id: pipelineId, organizationId },
    });

    if (!pipeline) {
      throw new NotFoundException('Pipeline nao encontrado');
    }

    await this.prisma.$transaction(
      dto.stageIds.map((stageId, index) =>
        this.prisma.stage.update({
          where: { id: stageId },
          data: { position: index },
        }),
      ),
    );

    return this.prisma.stage.findMany({
      where: { pipelineId },
      orderBy: { position: 'asc' },
    });
  }

  async getDefaultPipeline(organizationId: string) {
    let pipeline = await this.prisma.pipeline.findFirst({
      where: { organizationId, isDefault: true },
      include: { stages: { orderBy: { position: 'asc' } } },
    });

    if (!pipeline) {
      pipeline = await this.create(organizationId, {
        name: 'Pipeline Principal',
        isDefault: true,
      });
    }

    return pipeline;
  }

  async getStageById(stageId: string) {
    return this.prisma.stage.findUnique({
      where: { id: stageId },
      include: { pipeline: true },
    });
  }
}
