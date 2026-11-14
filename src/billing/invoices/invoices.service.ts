import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  private get client() {
    return this.prisma.client;
  }

  async findAll() {
    return this.client.invoice.findMany({
      include: { order: true, payment: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: number) {
    return this.client.invoice.findUnique({ where: { id } });
  }

  async findByOrder(orderId: number) {
    return this.client.invoice.findUnique({ where: { orderId } });
  }

  async findByStatus(status: string) {
    if (!['draft', 'issued', 'canceled'].includes(status)) {
      throw new BadRequestException('Invalid invoice status');
    }
    return this.client.invoice.findMany({ where: { status: status as any } });
  }

  async create(orderId: number, cashierId: string) {
    const order = await this.client.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status === 'canceled') {
      throw new BadRequestException('A canceled order cannot be invoiced');
    }
    const existing = await this.client.invoice.findUnique({ where: { orderId } });
    if (existing) throw new BadRequestException('An invoice already exists for this order');

    return this.client.invoice.create({
      data: {
        orderId,
        cashierId,
        subtotal: order.subtotal,
        taxRate: order.taxRate,
        taxAmount: order.taxAmount,
        total: order.total,
        status: 'draft',
      },
    });
  }

  async issue(orderId: number, cashierId: string) {
    try {
      return await this.client.$transaction(async (tx) => {
        const order = await tx.order.findUnique({ where: { id: orderId } });
        if (!order) throw new NotFoundException('Order not found');
        if (order.status === 'canceled') {
          throw new BadRequestException('A canceled order cannot be invoiced');
        }
        const existing = await tx.invoice.findUnique({ where: { orderId } });
        if (existing) throw new ConflictException('An invoice already exists for this order');

        return tx.invoice.create({
          data: {
            orderId,
            cashierId,
            subtotal: order.subtotal,
            taxRate: order.taxRate,
            taxAmount: order.taxAmount,
            total: order.total,
            status: 'issued',
            issuedAt: new Date(),
          },
          include: { order: true, payment: true },
        });
      });
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('An invoice already exists for this order');
      }
      throw error;
    }
  }

  async updateStatus(id: number, status: string) {
    if (!['draft', 'issued', 'canceled'].includes(status)) {
      throw new BadRequestException('Invalid invoice status');
    }

    return this.client.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({ where: { id } });
      if (!invoice) throw new NotFoundException('Invoice not found');
      if (invoice.status === status) return invoice;
      if (invoice.status === 'canceled' || (invoice.status === 'issued' && status === 'draft')) {
        throw new ConflictException(`Cannot move invoice from ${invoice.status} to ${status}`);
      }
      if (status === 'canceled') {
        const payment = await tx.payment.findUnique({ where: { invoiceId: id } });
        if (payment?.status === 'completed') {
          throw new BadRequestException('A paid invoice cannot be canceled');
        }
      }

      return tx.invoice.update({
        where: { id },
        data: {
          status: status as any,
          ...(status === 'issued' && { issuedAt: new Date() }),
        },
        include: { order: true, payment: true },
      });
    });
  }

  async getInvoiceWithPayment(id: number) {
    const invoice = await this.client.invoice.findUnique({ where: { id } });
    if (!invoice) return null;
    const payment = await this.client.payment.findUnique({ where: { invoiceId: id } });
    return { invoice, payment };
  }

  async delete(id: number) {
    return this.client.invoice.delete({ where: { id } });
  }
}
