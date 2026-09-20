import { Module } from '@nestjs/common';
import { DineInModule } from './dine-in/dine-in.module';
import { DeliveryModule } from './delivery/delivery.module';
import { DetailsModule } from './details/details.module';
import { HistoryModule } from './history/history.module';

@Module({
  imports: [DineInModule, DeliveryModule, DetailsModule, HistoryModule],
})
export class OrdersModule {}
