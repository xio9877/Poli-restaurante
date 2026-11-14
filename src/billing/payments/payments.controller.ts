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
import { PaymentsService } from './payments.service';
import { SupabaseAuthGuard } from '@/auth/supabase-auth.guard';
import {
  CreatePaymentDto,
  ProcessPaymentDto,
  UpdatePaymentStatusDto,
} from './dto/process-payment.dto';

@Controller('payments')
@UseGuards(SupabaseAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  async create(@Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(dto);
  }

  @Get('invoice/:invoiceId')
  async findByInvoice(@Param('invoiceId', ParseIntPipe) invoiceId: number) {
    return this.paymentsService.findByInvoice(invoiceId);
  }

  @Patch('invoice/:invoiceId/status')
  async updateStatus(
    @Param('invoiceId', ParseIntPipe) invoiceId: number,
    @Body() dto: UpdatePaymentStatusDto
  ) {
    return this.paymentsService.updateStatus(invoiceId, dto.status, dto.notes);
  }

  @Post('invoice/:invoiceId/process')
  async processPayment(
    @Param('invoiceId', ParseIntPipe) invoiceId: number,
    @Body() dto: ProcessPaymentDto
  ) {
    return this.paymentsService.processPayment(invoiceId, dto);
  }

  @Post('invoice/:invoiceId/refund')
  async refund(@Param('invoiceId', ParseIntPipe) invoiceId: number, @Body('notes') notes?: string) {
    return this.paymentsService.refund(invoiceId, notes);
  }
}
