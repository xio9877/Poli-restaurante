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
import { DineInService } from './dine-in.service';
import { SupabaseAuthGuard } from '@/auth/supabase-auth.guard';
import { CurrentUserId } from '@/common/decorators/current-user.decorator';
import { PaginatedResultDto } from '@/common/dto/pagination.dto';
import { BaseQueryDto } from '@/common/dto/query.dto';
import { CreateDineInDto, UpdateDineInDto } from './dto/dine-in.dto';
import { CreateDineInOrderDto } from '../dto/order.dto';

@Controller('dine-in')
@UseGuards(SupabaseAuthGuard)
export class DineInController {
  constructor(private readonly dineInService: DineInService) {}

  @Post('orders')
  async createOrder(@Body() dto: CreateDineInOrderDto, @CurrentUserId() userId: string) {
    return this.dineInService.createOrder(dto, userId);
  }

  @Post()
  async create(@Body() dto: CreateDineInDto, @CurrentUserId() userId: string) {
    return this.dineInService.create(dto, userId);
  }

  @Get()
  async findAll(@Query() query: BaseQueryDto): Promise<PaginatedResultDto<any>> {
    return this.dineInService.findAll(query);
  }

  @Get(':orderId')
  async findByOrderId(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.dineInService.findById(orderId);
  }

  @Patch(':orderId')
  async update(@Param('orderId', ParseIntPipe) orderId: number, @Body() dto: UpdateDineInDto) {
    return this.dineInService.update(orderId, dto);
  }

  @Delete(':orderId')
  async delete(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.dineInService.delete(orderId);
  }
}
