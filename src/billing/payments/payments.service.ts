import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  private get client() {
    return this.prisma.client;
  }

  async findByInvoice(invoiceId: number) {
    return this.client.payment.findUnique({ where: { invoiceId } });
  }

  async create(data: {
    invoiceId: number;
    amount: number;
    method: string;
    status?: string;
    notes?: string;
  }) {
    const invoice = await this.client.invoice.findUnique({
      where: { id: data.invoiceId },
      include: { order: true },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status !== 'issued')
      throw new BadRequestException('Invoice must be issued before payment');
    if (invoice.order.status === 'canceled') {
      throw new BadRequestException('A canceled order cannot be paid');
    }
    if (data.status && data.status !== 'pending') {
      throw new BadRequestException('Use the payment process endpoint to complete a payment');
    }
    if (Math.round(Number(data.amount) * 100) !== Math.round(Number(invoice.total) * 100)) {
      throw new BadRequestException('Payment amount must match the invoice total');
    }

    return this.client.payment.create({
      data: {
        invoiceId: data.invoiceId,
        amount: data.amount,
        method: data.method as any,
        status: 'pending',
        notes: data.notes,
      },
    });
  }

  async updateStatus(invoiceId: number, status: string, notes?: string) {
    if (!['pending', 'failed'].includes(status)) {
      throw new BadRequestException('Invalid payment status');
    }

    return this.client.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
      if (!invoice) throw new NotFoundException('Invoice not found');
      const payment = await tx.payment.findUnique({ where: { invoiceId } });
      if (!payment) throw new NotFoundException('Payment not found');
      if (payment.status === 'completed' || payment.status === 'refunded') {
        throw new BadRequestException('Completed or refunded payments cannot be changed');
      }
      return tx.payment.update({
        where: { invoiceId },
        data: {
          status: status as any,
          ...(status === 'completed' && { paidAt: new Date() }),
          ...(notes && { notes }),
        },
      });
    });
  }

  async processPayment(
    invoiceId: number,
    data: { method: string; amount: number; notes?: string }
  ) {
    try {
      return await this.client.$transaction(async (tx) => {
        const invoice = await tx.invoice.findUnique({
          where: { id: invoiceId },
          include: { order: true },
        });
        if (!invoice) throw new NotFoundException('Invoice not found');
        if (invoice.status !== 'issued')
          throw new BadRequestException('Invoice must be issued before payment');
        if (invoice.order.status === 'canceled') {
          throw new BadRequestException('A canceled order cannot be paid');
        }
        if (Math.round(Number(data.amount) * 100) !== Math.round(Number(invoice.total) * 100)) {
          throw new BadRequestException('Payment amount must match the invoice total');
        }
        const existing = await tx.payment.findUnique({ where: { invoiceId } });
        if (existing?.status === 'completed') {
          throw new BadRequestException('Invoice has already been paid');
        }
        if (existing?.status === 'refunded') {
          throw new BadRequestException('A refunded payment cannot be processed again');
        }

        const paymentData = {
          amount: data.amount,
          method: data.method as any,
          status: 'completed' as const,
          notes: data.notes,
          paidAt: new Date(),
        };
        if (!existing) {
          return tx.payment.create({ data: { invoiceId, ...paymentData } });
        }
        const updated = await tx.payment.updateMany({
          where: { invoiceId, status: { in: ['pending', 'failed'] } },
          data: paymentData,
        });
        if (!updated.count) throw new BadRequestException('Invoice has already been paid');
        return tx.payment.findUniqueOrThrow({ where: { invoiceId } });
      });
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('Invoice has already been paid');
      }
      throw error;
    }
  }

  async refund(invoiceId: number, notes?: string) {
    const payment = await this.client.payment.findUnique({ where: { invoiceId } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== 'completed')
      throw new BadRequestException('Only completed payments can be refunded');

    return this.client.payment.update({
      where: { invoiceId },
      data: {
        status: 'refunded',
        notes: notes
          ? [payment.notes, `Refund: ${notes}`].filter(Boolean).join(' | ')
          : payment.notes,
      },
    });
  }
}
