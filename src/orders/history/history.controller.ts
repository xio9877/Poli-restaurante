import { Controller, Get, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { HistoryService } from './history.service';
import { SupabaseAuthGuard } from '@/auth/supabase-auth.guard';

@Controller('orders/history')
@UseGuards(SupabaseAuthGuard)
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get('order/:orderId')
  async getOrderStateHistory(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.historyService.getOrderStateHistory(orderId);
  }

  @Get('detail/:detailId')
  async getDetailStateHistory(@Param('detailId', ParseIntPipe) detailId: number) {
    return this.historyService.getDetailStateHistory(detailId);
  }

  @Get('user/:userId')
  async getUserActivity(@Param('userId') userId: string, @Query('limit') limit?: number) {
    return this.historyService.getUserActivity(userId, limit || 50);
  }
}
