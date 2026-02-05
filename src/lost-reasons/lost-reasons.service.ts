import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLostReasonDto } from './dto';

@Injectable()
export class LostReasonsService {
  constructor(private prisma: PrismaService) {}

  async create(organizationId: string, dto: CreateLostReasonDto) {
    let position = dto.position;
    if (position === undefined) {
      const last = await this.prisma.lostReason.findFirst({
        where: { organizationId },
        orderBy: { position: 'desc' },
      });
      position = last ? last.position + 1 : 0;
    }

    return this.prisma.lostReason.create({
      data: { name: dto.name, position, organizationId },
    });
  }

  async findAll(organizationId: string) {
    return this.prisma.lostReason.findMany({
      where: { organizationId },
      orderBy: { position: 'asc' },
    });
  }

  async remove(organizationId: string, id: string) {
    const reason = await this.prisma.lostReason.findFirst({ where: { id, organizationId } });
    if (!reason) throw new NotFoundException('Motivo nao encontrado');
    await this.prisma.lostReason.delete({ where: { id } });
    return { message: 'Motivo removido com sucesso' };
  }
}
