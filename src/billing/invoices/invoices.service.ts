import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PaginatedResultDto } from '../../common/dto/pagination.dto';

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
    return this.client.invoice.findMany({ where: { status: status as any } });
  }

  async create(orderId: number, cashierId: string) {
    const order = await this.client.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
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

  async updateStatus(id: number, status: string) {
    if (!['draft', 'issued', 'canceled'].includes(status)) {
      throw new BadRequestException('Invalid invoice status');
    }

    const invoice = await this.client.invoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (status === 'canceled') {
      const payment = await this.client.payment.findUnique({ where: { invoiceId: id } });
      if (payment?.status === 'completed') {
        throw new BadRequestException('A paid invoice cannot be canceled');
      }
    }

    const updateData: any = { status: status as any };
    if (status === 'issued') updateData.issuedAt = new Date();
    return this.client.invoice.update({ where: { id }, data: updateData });
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
