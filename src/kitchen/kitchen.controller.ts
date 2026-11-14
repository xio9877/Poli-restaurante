import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { KitchenService } from './kitchen.service';
import { SupabaseAuthGuard } from '@/auth/supabase-auth.guard';
import { CurrentUserId } from '@/common/decorators/current-user.decorator';
import { PaginatedResultDto } from '@/common/dto/pagination.dto';
import { UpdateDetailStatusDto } from '@/orders/details/dto/detail.dto';

@Controller('kitchen')
@UseGuards(SupabaseAuthGuard)
export class KitchenController {
  constructor(private readonly kitchenService: KitchenService) {}

  @Get('orders')
  async getKitchenOrders(): Promise<PaginatedResultDto<any>> {
    return this.kitchenService.getKitchenOrders();
  }

  @Get('orders/:id')
  async getOrderDetails(@Param('id', ParseIntPipe) id: number) {
    return this.kitchenService.getOrderForKitchen(id);
  }

  @Get('details/pending')
  async getPendingDetails(): Promise<PaginatedResultDto<any>> {
    return this.kitchenService.getPendingDetails();
  }

  @Patch('details/:id/status')
  async updateDetailStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDetailStatusDto,
    @CurrentUserId() userId: string
  ) {
    return this.kitchenService.updateDetailStatus(id, dto.status, userId, dto.notes);
  }

  @Get('stats')
  async getPrepStats() {
    return this.kitchenService.getPrepStats();
  }
}
