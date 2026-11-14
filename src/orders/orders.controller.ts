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
import { OrdersService } from './orders.service';
import { SupabaseAuthGuard } from '@/auth/supabase-auth.guard';
import { CurrentUserId } from '@/common/decorators/current-user.decorator';
import { PaginatedResultDto } from '@/common/dto/pagination.dto';
import { CreateOrderDto, CreateDineInOrderDto, UpdateOrderStatusDto } from './dto/order.dto';
import { OrderQueryDto } from '@/common/dto/query.dto';

@Controller('orders')
@UseGuards(SupabaseAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  async create(@Body() dto: CreateOrderDto, @CurrentUserId() userId: string) {
    return this.ordersService.createWithDetails(dto, userId);
  }

  @Get()
  async findAll(@Query() query: OrderQueryDto): Promise<PaginatedResultDto<any>> {
    return this.ordersService.findAll(query);
  }

  @Get('open')
  async findOpen() {
    return this.ordersService.findOpenOrders();
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.getOrderWithDetails(id);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUserId() userId: string
  ) {
    return this.ordersService.updateStatus(id, dto.status, userId, dto.notes);
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.delete(id);
  }
}
