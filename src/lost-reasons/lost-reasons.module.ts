import { Module } from '@nestjs/common';
import { LostReasonsController } from './lost-reasons.controller';
import { LostReasonsService } from './lost-reasons.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LostReasonsController],
  providers: [LostReasonsService],
  exports: [LostReasonsService],
})
export class LostReasonsModule {}
