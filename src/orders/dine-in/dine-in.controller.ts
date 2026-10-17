import { Controller } from '@nestjs/common';
import { DineInService } from './dine-in.service';

@Controller('orders/dine-in')
export class DineInController {
  constructor(private readonly dineInService: DineInService) {}
}
