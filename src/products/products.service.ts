import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto, AddDealProductDto, UpdateDealProductDto } from './dto';
import { Prisma, DealEventType } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(organizationId: string, dto: CreateProductDto) {
    if (dto.sku) {
      const existing = await this.prisma.product.findUnique({
        where: { sku_organizationId: { sku: dto.sku, organizationId } },
      });
      if (existing) throw new ConflictException('SKU ja existe');
    }

    return this.prisma.product.create({
      data: {
        name: dto.name,
        description: dto.description,
        sku: dto.sku,
        price: dto.price,
        cost: dto.cost,
        isActive: dto.isActive ?? true,
        category: dto.category,
        organizationId,
      },
    });
  }

  async findAll(organizationId: string, filters?: { category?: string; isActive?: boolean; search?: string }) {
    const where: Prisma.ProductWhereInput = { organizationId };
    if (filters?.category) where.category = filters.category;
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { sku: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.product.findMany({ where, orderBy: { name: 'asc' } });
  }

  async findOne(organizationId: string, id: string) {
    const product = await this.prisma.product.findFirst({ where: { id, organizationId } });
    if (!product) throw new NotFoundException('Produto nao encontrado');
    return product;
  }

  async update(organizationId: string, id: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.findFirst({ where: { id, organizationId } });
    if (!product) throw new NotFoundException('Produto nao encontrado');
    if (dto.sku && dto.sku !== product.sku) {
      const existing = await this.prisma.product.findFirst({
        where: { sku: dto.sku, organizationId, id: { not: id } },
      });
      if (existing) throw new ConflictException('SKU ja existe');
    }
    return this.prisma.product.update({ where: { id }, data: dto });
  }

  async remove(organizationId: string, id: string) {
    const product = await this.prisma.product.findFirst({ where: { id, organizationId } });
    if (!product) throw new NotFoundException('Produto nao encontrado');
    await this.prisma.product.delete({ where: { id } });
    return { message: 'Produto removido com sucesso' };
  }

  async addProductToDeal(organizationId: string, dealId: string, dto: AddDealProductDto, memberId: string) {
    const deal = await this.prisma.deal.findFirst({ where: { id: dealId, organizationId } });
    if (!deal) throw new NotFoundException('Deal nao encontrado');

    const product = await this.prisma.product.findFirst({ where: { id: dto.productId, organizationId } });
    if (!product) throw new NotFoundException('Produto nao encontrado');

    const existing = await this.prisma.dealProduct.findUnique({
      where: { dealId_productId: { dealId, productId: dto.productId } },
    });
    if (existing) throw new ConflictException('Produto ja adicionado ao deal');

    const unitPrice = dto.unitPrice ?? Number(product.price);
    const quantity = dto.quantity ?? 1;
    const discount = dto.discount ?? 0;
    const total = (unitPrice * quantity) - discount;

    const dealProduct = await this.prisma.dealProduct.create({
      data: { dealId, productId: dto.productId, quantity, unitPrice, discount, total },
      include: { product: true },
    });

    await this.updateDealValue(dealId);

    await this.prisma.dealEvent.create({
      data: {
        dealId,
        type: DealEventType.PRODUCT_ADDED,
        data: { productId: dto.productId, productName: product.name },
        userId: memberId,
      },
    });

    return dealProduct;
  }

  async updateDealProduct(organizationId: string, dealId: string, dealProductId: string, dto: UpdateDealProductDto) {
    const deal = await this.prisma.deal.findFirst({ where: { id: dealId, organizationId } });
    if (!deal) throw new NotFoundException('Deal nao encontrado');

    const dealProduct = await this.prisma.dealProduct.findFirst({ where: { id: dealProductId, dealId } });
    if (!dealProduct) throw new NotFoundException('Produto do deal nao encontrado');

    const unitPrice = dto.unitPrice ?? Number(dealProduct.unitPrice);
    const quantity = dto.quantity ?? dealProduct.quantity;
    const discount = dto.discount ?? Number(dealProduct.discount);
    const total = (unitPrice * quantity) - discount;

    const updated = await this.prisma.dealProduct.update({
      where: { id: dealProductId },
      data: { quantity, unitPrice, discount, total },
      include: { product: true },
    });

    await this.updateDealValue(dealId);
    return updated;
  }

  async removeDealProduct(organizationId: string, dealId: string, dealProductId: string) {
    const deal = await this.prisma.deal.findFirst({ where: { id: dealId, organizationId } });
    if (!deal) throw new NotFoundException('Deal nao encontrado');

    const dealProduct = await this.prisma.dealProduct.findFirst({ where: { id: dealProductId, dealId } });
    if (!dealProduct) throw new NotFoundException('Produto do deal nao encontrado');

    await this.prisma.dealProduct.delete({ where: { id: dealProductId } });
    await this.updateDealValue(dealId);
    return { message: 'Produto removido do deal' };
  }

  async getDealProducts(organizationId: string, dealId: string) {
    const deal = await this.prisma.deal.findFirst({ where: { id: dealId, organizationId } });
    if (!deal) throw new NotFoundException('Deal nao encontrado');
    return this.prisma.dealProduct.findMany({
      where: { dealId },
      include: { product: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  private async updateDealValue(dealId: string) {
    const products = await this.prisma.dealProduct.findMany({ where: { dealId } });
    const totalValue = products.reduce((sum, p) => sum + Number(p.total), 0);
    await this.prisma.deal.update({ where: { id: dealId }, data: { value: totalValue } });
  }
}
