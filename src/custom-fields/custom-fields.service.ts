import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomFieldDto, UpdateCustomFieldDto, SetCustomFieldValueDto } from './dto';
import { CustomFieldEntity } from '@prisma/client';

@Injectable()
export class CustomFieldsService {
  constructor(private prisma: PrismaService) {}

  async create(organizationId: string, dto: CreateCustomFieldDto) {
    const existing = await this.prisma.customField.findUnique({
      where: { organizationId_entity_name: { organizationId, entity: dto.entity, name: dto.name } },
    });
    if (existing) throw new ConflictException('Campo com este nome ja existe');

    let position = dto.position;
    if (position === undefined) {
      const last = await this.prisma.customField.findFirst({
        where: { organizationId, entity: dto.entity },
        orderBy: { position: 'desc' },
      });
      position = last ? last.position + 1 : 0;
    }

    return this.prisma.customField.create({
      data: {
        entity: dto.entity,
        name: dto.name,
        label: dto.label,
        type: dto.type,
        options: dto.options,
        isRequired: dto.isRequired ?? false,
        position,
        organizationId,
      },
    });
  }

  async findAll(organizationId: string, entity?: CustomFieldEntity) {
    const where: any = { organizationId };
    if (entity) where.entity = entity;
    return this.prisma.customField.findMany({ where, orderBy: { position: 'asc' } });
  }

  async findOne(organizationId: string, id: string) {
    const field = await this.prisma.customField.findFirst({ where: { id, organizationId } });
    if (!field) throw new NotFoundException('Campo nao encontrado');
    return field;
  }

  async update(organizationId: string, id: string, dto: UpdateCustomFieldDto) {
    const field = await this.prisma.customField.findFirst({ where: { id, organizationId } });
    if (!field) throw new NotFoundException('Campo nao encontrado');
    return this.prisma.customField.update({ where: { id }, data: dto });
  }

  async remove(organizationId: string, id: string) {
    const field = await this.prisma.customField.findFirst({ where: { id, organizationId } });
    if (!field) throw new NotFoundException('Campo nao encontrado');
    await this.prisma.customField.delete({ where: { id } });
    return { message: 'Campo removido com sucesso' };
  }

  async setValues(organizationId: string, entityId: string, values: SetCustomFieldValueDto[]) {
    for (const v of values) {
      const field = await this.prisma.customField.findFirst({
        where: { id: v.customFieldId, organizationId },
      });
      if (!field) continue;

      await this.prisma.customFieldValue.upsert({
        where: { customFieldId_entityId: { customFieldId: v.customFieldId, entityId } },
        update: { value: v.value },
        create: {
          customFieldId: v.customFieldId,
          entityId,
          value: v.value,
          dealId: field.entity === CustomFieldEntity.DEAL ? entityId : null,
          leadId: field.entity === CustomFieldEntity.LEAD ? entityId : null,
        },
      });
    }
    return this.getValues(organizationId, entityId);
  }

  async getValues(organizationId: string, entityId: string) {
    return this.prisma.customFieldValue.findMany({
      where: { entityId },
      include: { customField: true },
    });
  }
}
