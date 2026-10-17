import { Controller } from '@nestjs/common';
import { DetailsService } from './details.service';

@Controller('orders/details')
export class DetailsController {
  constructor(private readonly detailsService: DetailsService) {}
}
