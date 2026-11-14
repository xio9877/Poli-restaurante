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
import { DetailsService } from './details.service';
import { SupabaseAuthGuard } from '@/auth/supabase-auth.guard';
import { CurrentUserId } from '@/common/decorators/current-user.decorator';
import { PaginatedResultDto } from '@/common/dto/pagination.dto';
import { CreateOrderDetailDto, AddDetailToOrderDto, UpdateDetailStatusDto } from './dto/detail.dto';

@Controller('orders/:orderId/details')
@UseGuards(SupabaseAuthGuard)
export class DetailsController {
  constructor(private readonly detailsService: DetailsService) {}

  @Post()
  async addToOrder(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() dto: AddDetailToOrderDto,
    @CurrentUserId() userId: string
  ) {
    return this.detailsService.addToOrder(orderId, dto, userId);
  }

  @Get()
  async findByOrder(
    @Param('orderId', ParseIntPipe) orderId: number
  ): Promise<PaginatedResultDto<any>> {
    return this.detailsService.findByOrder(orderId);
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.detailsService.findById(id);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDetailStatusDto,
    @CurrentUserId() userId: string
  ) {
    return this.detailsService.updateStatus(id, dto.status, userId, dto.notes);
  }

  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateOrderDetailDto) {
    return this.detailsService.update(id, dto);
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.detailsService.delete(id);
  }
}
