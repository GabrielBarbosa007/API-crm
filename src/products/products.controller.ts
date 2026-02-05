import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, AddDealProductDto, UpdateDealProductDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentOrganization } from '../common/decorators/current-organization.decorator';
import { GetUser } from '../common/decorators/get-user.decorator';
import type { JwtPayload } from '../common/decorators/get-user.decorator';
import { Role } from '@prisma/client';

@Controller()
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post('products')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN, Role.MANAGER)
  create(@CurrentOrganization() org: any, @Body() dto: CreateProductDto) {
    return this.productsService.create(org.id, dto);
  }

  @Get('products')
  findAll(
    @CurrentOrganization() org: any,
    @Query('category') category?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    return this.productsService.findAll(org.id, {
      category,
      isActive: isActive ? isActive === 'true' : undefined,
      search,
    });
  }

  @Get('products/:id')
  findOne(@CurrentOrganization() org: any, @Param('id') id: string) {
    return this.productsService.findOne(org.id, id);
  }

  @Put('products/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN, Role.MANAGER)
  update(@CurrentOrganization() org: any, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(org.id, id, dto);
  }

  @Delete('products/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  remove(@CurrentOrganization() org: any, @Param('id') id: string) {
    return this.productsService.remove(org.id, id);
  }

  // Deal Products
  @Post('deals/:dealId/products')
  addProductToDeal(
    @CurrentOrganization() org: any,
    @GetUser() user: JwtPayload,
    @Param('dealId') dealId: string,
    @Body() dto: AddDealProductDto,
  ) {
    return this.productsService.addProductToDeal(org.id, dealId, dto, user.organizationMemberId!);
  }

  @Get('deals/:dealId/products')
  getDealProducts(@CurrentOrganization() org: any, @Param('dealId') dealId: string) {
    return this.productsService.getDealProducts(org.id, dealId);
  }

  @Put('deals/:dealId/products/:productId')
  updateDealProduct(
    @CurrentOrganization() org: any,
    @Param('dealId') dealId: string,
    @Param('productId') productId: string,
    @Body() dto: UpdateDealProductDto,
  ) {
    return this.productsService.updateDealProduct(org.id, dealId, productId, dto);
  }

  @Delete('deals/:dealId/products/:productId')
  removeDealProduct(
    @CurrentOrganization() org: any,
    @Param('dealId') dealId: string,
    @Param('productId') productId: string,
  ) {
    return this.productsService.removeDealProduct(org.id, dealId, productId);
  }
}
