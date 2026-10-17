import { Controller } from '@nestjs/common';
import { HistoryService } from './history.service';

@Controller('orders/history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}
}
