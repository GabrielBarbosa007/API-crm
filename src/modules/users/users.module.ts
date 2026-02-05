import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { RolesGuard } from '../../common/guards/roles.guard';
import { LimitGuard } from '../../common/guards/limit.guard';
import { FeatureGuard } from '../../common/guards/feature.guard';

@Module({
  imports: [PrismaModule, OrganizationsModule],
  controllers: [UsersController],
  providers: [UsersService, RolesGuard, LimitGuard, FeatureGuard],
  exports: [UsersService],
})
export class UsersModule {}
