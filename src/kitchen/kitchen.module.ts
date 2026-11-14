import { Module } from '@nestjs/common';
import { DetailsModule } from '../orders/details/details.module';
import { KitchenController } from './kitchen.controller';
import { KitchenService } from './kitchen.service';

@Module({
  imports: [DetailsModule],
  controllers: [KitchenController],
  providers: [KitchenService],
})
export class KitchenModule {}
