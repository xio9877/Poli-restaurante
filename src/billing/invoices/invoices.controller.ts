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
import { InvoicesService } from './invoices.service';
import { SupabaseAuthGuard } from '@/auth/supabase-auth.guard';
import { CurrentUserId } from '@/common/decorators/current-user.decorator';
import { CreateInvoiceDto, UpdateInvoiceStatusDto } from './dto/create-invoice.dto';

@Controller('invoices')
@UseGuards(SupabaseAuthGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  async create(@Body() dto: CreateInvoiceDto, @CurrentUserId() cashierId: string) {
    return this.invoicesService.create(dto.orderId, cashierId);
  }

  @Post('issue')
  async issue(@Body() dto: CreateInvoiceDto, @CurrentUserId() cashierId: string) {
    return this.invoicesService.issue(dto.orderId, cashierId);
  }

  @Get()
  async findAll() {
    return this.invoicesService.findAll();
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.invoicesService.findById(id);
  }

  @Get('order/:orderId')
  async findByOrder(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.invoicesService.findByOrder(orderId);
  }

  @Get('status/:status')
  async findByStatus(@Param('status') status: string) {
    return this.invoicesService.findByStatus(status);
  }

  @Get(':id/with-payment')
  async getInvoiceWithPayment(@Param('id', ParseIntPipe) id: number) {
    return this.invoicesService.getInvoiceWithPayment(id);
  }

  @Patch(':id/status')
  async updateStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateInvoiceStatusDto) {
    return this.invoicesService.updateStatus(id, dto.status);
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.invoicesService.delete(id);
  }
}
