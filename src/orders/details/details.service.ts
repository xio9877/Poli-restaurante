import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PaginatedResultDto } from '../../common/dto/pagination.dto';

@Injectable()
export class DetailsService {
  constructor(private prisma: PrismaService) {}

  private get client() {
    return this.prisma.client;
  }

  async findByOrder(orderId: number): Promise<PaginatedResultDto<any>> {
    const data = await this.client.orderDetail.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' },
    });
    return new PaginatedResultDto(data, data.length, 1, data.length);
  }

  async findById(id: number) {
    return this.client.orderDetail.findUnique({ where: { id } });
  }

  async addToOrder(
    orderId: number,
    dto: { productId: number; amount: number; notes?: string },
    userId: string
  ) {
    const order = await this.client.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error('Order not found');
    if (order.status !== 'open') throw new Error('Cannot add to non-open order');

    const product = await this.client.product.findUnique({ where: { id: dto.productId } });
    if (!product) throw new Error('Product not found');
    if (product.status !== 'available') throw new Error('Product not available');

    const unitPrice = Number(product.price);
    const lineTotal = unitPrice * dto.amount;

    return this.client.$transaction(async (tx) => {
      const detail = await tx.orderDetail.create({
        data: {
          orderId,
          productId: dto.productId,
          amount: dto.amount,
          unitPrice,
          notes: dto.notes,
          state: 'pending',
        },
      });

      const newSubtotal = Number(order.subtotal) + lineTotal;
      const taxRate = Number(order.taxRate) || 0.19;
      const newTaxAmount = newSubtotal * taxRate;
      const newTotal = newSubtotal + newTaxAmount - Number(order.discount || 0);

      await tx.order.update({
        where: { id: orderId },
        data: { subtotal: newSubtotal, taxAmount: newTaxAmount, total: newTotal },
      });

      await tx.orderDetailStateHistory.create({
        data: {
          orderDetailId: detail.id,
          userId,
          oldState: null,
          newState: 'pending',
          notes: `Producto agregado: ${product.name}`,
        },
      });

      return detail;
    });
  }

  async update(id: number, data: { amount?: number; notes?: string }) {
    return this.client.orderDetail.update({ where: { id }, data });
  }

  async updateStatus(id: number, status: string, userId: string, notes?: string) {
    const detail = await this.client.orderDetail.findUnique({ where: { id } });
    if (!detail) throw new Error('Order detail not found');

    await this.client.$transaction(async (tx) => {
      await tx.orderDetail.update({
        where: { id },
        data: {
          state: status as any,
          ...(status === 'served' && { completedAt: new Date() }),
          ...(status === 'canceled' && { canceledAt: new Date() }),
        },
      });

      await tx.orderDetailStateHistory.create({
        data: { orderDetailId: id, userId, oldState: detail.state, newState: status as any, notes },
      });
    });

    return this.findById(id);
  }

  async delete(id: number) {
    const detail = await this.client.orderDetail.findUnique({ where: { id } });
    if (!detail) throw new Error('Order detail not found');

    const order = await this.client.order.findUnique({ where: { id: detail.orderId } });
    const lineTotal = Number(detail.unitPrice) * detail.amount;

    return this.client.$transaction(async (tx) => {
      await tx.orderDetail.delete({ where: { id } });

      if (order) {
        const newSubtotal = Number(order.subtotal) - lineTotal;
        const taxRate = Number(order.taxRate) || 0.19;
        const newTaxAmount = newSubtotal * taxRate;
        const newTotal = newSubtotal + newTaxAmount - Number(order.discount || 0);

        await tx.order.update({
          where: { id: detail.orderId },
          data: { subtotal: newSubtotal, taxAmount: newTaxAmount, total: newTotal },
        });
      }
    });
  }
}
