import { Module } from '@nestjs/common';
import { DineInController } from './dine-in.controller';
import { DineInService } from './dine-in.service';

@Module({
  controllers: [DineInController],
  providers: [DineInService],
})
export class DineInModule {}
