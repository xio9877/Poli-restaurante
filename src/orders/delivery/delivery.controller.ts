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
import { DeliveryService } from './delivery.service';
import { SupabaseAuthGuard } from '@/auth/supabase-auth.guard';
import { PaginatedResultDto } from '@/common/dto/pagination.dto';
import { CurrentUserId } from '@/common/decorators/current-user.decorator';
import { CreateDeliveryOrderDto } from './dto/create-delivery-order.dto';

@Controller('delivery')
@UseGuards(SupabaseAuthGuard)
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Post()
  async create(@Body() dto: any) {
    return this.deliveryService.create(dto);
  }

  @Post('orders')
  async createOrder(@Body() dto: CreateDeliveryOrderDto, @CurrentUserId() userId: string) {
    return this.deliveryService.createOrder(dto, userId);
  }

  @Get()
  async findAll(): Promise<PaginatedResultDto<any>> {
    return this.deliveryService.findAll();
  }

  @Get(':orderId')
  async findById(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.deliveryService.findById(orderId);
  }

  @Get('status/:status')
  async findByStatus(@Param('status') status: string) {
    return this.deliveryService.findByStatus(status);
  }

  @Get('domiciliary/:id')
  async findByDomiciliary(@Param('id') domiciliaryId: string) {
    return this.deliveryService.findByDomiciliary(domiciliaryId);
  }

  @Patch(':orderId/status')
  async updateStatus(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body('status') status: string,
    @Body('notes') notes?: string
  ) {
    return this.deliveryService.updateStatus(orderId, status, notes);
  }

  @Patch(':orderId')
  async update(@Param('orderId', ParseIntPipe) orderId: number, @Body() dto: any) {
    return this.deliveryService.update(orderId, dto);
  }

  @Delete(':orderId')
  async delete(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.deliveryService.delete(orderId);
  }
}
