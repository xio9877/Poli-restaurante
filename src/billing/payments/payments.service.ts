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
    const invoice = await this.client.invoice.findUnique({ where: { id: data.invoiceId } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status !== 'issued')
      throw new BadRequestException('Invoice must be issued before payment');
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
    if (!['pending', 'completed', 'failed', 'refunded'].includes(status)) {
      throw new BadRequestException('Invalid payment status');
    }

    const invoice = await this.client.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (status === 'completed' && invoice.status !== 'issued') {
      throw new BadRequestException('Invoice must be issued before payment');
    }

    const updateData: any = { status: status as any };
    if (status === 'completed') {
      const payment = await this.client.payment.findUnique({ where: { invoiceId } });
      if (
        !payment ||
        Math.round(Number(payment.amount) * 100) !== Math.round(Number(invoice.total) * 100)
      ) {
        throw new BadRequestException('Payment amount must match the invoice total');
      }
      updateData.paidAt = new Date();
    }
    if (notes) updateData.notes = notes;
    return this.client.payment.update({ where: { invoiceId }, data: updateData });
  }

  async processPayment(
    invoiceId: number,
    data: { method: string; amount: number; notes?: string }
  ) {
    const invoice = await this.client.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status !== 'issued')
      throw new BadRequestException('Invoice must be issued before payment');
    if (Math.round(Number(data.amount) * 100) !== Math.round(Number(invoice.total) * 100)) {
      throw new BadRequestException('Payment amount must match the invoice total');
    }

    return this.client.$transaction(async (tx) => {
      const existing = await tx.payment.findUnique({ where: { invoiceId } });
      if (existing?.status === 'completed') {
        throw new BadRequestException('Invoice has already been paid');
      }

      const paymentData = {
        amount: data.amount,
        method: data.method as any,
        status: 'completed' as const,
        notes: data.notes,
        paidAt: new Date(),
      };
      const payment = await tx.payment.upsert({
        where: { invoiceId },
        create: { invoiceId, ...paymentData },
        update: paymentData,
      });

      await tx.invoice.update({ where: { id: invoiceId }, data: { status: 'issued' } });

      return payment;
    });
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
        notes: notes ? `${payment.notes || ''} | Refund: ${notes}` : payment.notes,
      },
    });
  }
}
