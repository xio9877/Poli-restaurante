import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PaginatedResultDto } from '../../common/dto/pagination.dto';
import { calculateOrderTotals } from '../order-totals';
import { OrderDetailStatus } from './dto/detail.dto';

@Injectable()
export class DetailsService {
  constructor(private prisma: PrismaService) {}

  private get client() {
    return this.prisma.client;
  }

  async findByOrder(orderId: number): Promise<PaginatedResultDto<any>> {
    const order = await this.client.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    const data = await this.client.orderDetail.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' },
      include: { product: true },
    });
    return new PaginatedResultDto(data, data.length, 1, Math.max(data.length, 1));
  }

  async findById(id: number, orderId?: number) {
    const detail = await this.client.orderDetail.findFirst({
      where: { id, ...(orderId === undefined ? {} : { orderId }) },
      include: { product: true },
    });
    if (!detail) throw new NotFoundException('Order detail not found');
    return detail;
  }

  async addToOrder(
    orderId: number,
    dto: { productId: number; amount: number; notes?: string },
    userId: string
  ) {
    return this.client.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) throw new NotFoundException('Order not found');
      if (order.status !== 'open') throw new BadRequestException('Cannot add to non-open order');

      const product = await tx.product.findUnique({ where: { id: dto.productId } });
      if (!product) throw new NotFoundException('Product not found');
      if (product.status !== 'available') throw new BadRequestException('Product not available');

      const unitPrice = Number(product.price);
      const subtotal = Number(order.subtotal) + unitPrice * dto.amount;
      const totals = calculateOrderTotals(subtotal, Number(order.taxRate), Number(order.discount));
      const detail = await tx.orderDetail.create({
        data: {
          orderId,
          productId: dto.productId,
          amount: dto.amount,
          unitPrice,
          notes: dto.notes,
          state: 'pending',
        },
        include: { product: true },
      });

      await tx.order.update({
        where: { id: orderId },
        data: totals,
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

  async update(id: number, data: { amount?: number; notes?: string }, orderId?: number) {
    if (data.amount === undefined && data.notes === undefined) {
      throw new BadRequestException('At least one detail field must be provided');
    }

    return this.client.$transaction(async (tx) => {
      const detail = await tx.orderDetail.findFirst({
        where: { id, ...(orderId === undefined ? {} : { orderId }) },
      });
      if (!detail) throw new NotFoundException('Order detail not found');

      const order = await tx.order.findUnique({ where: { id: detail.orderId } });
      if (!order) throw new NotFoundException('Order not found');
      if (order.status !== 'open') throw new BadRequestException('Cannot edit a non-open order');

      const amount = data.amount ?? detail.amount;
      const subtotal = Number(order.subtotal) + Number(detail.unitPrice) * (amount - detail.amount);
      const totals = calculateOrderTotals(subtotal, Number(order.taxRate), Number(order.discount));

      await tx.order.update({ where: { id: order.id }, data: totals });
      return tx.orderDetail.update({
        where: { id },
        data,
        include: { product: true },
      });
    });
  }

  async updateStatus(
    id: number,
    status: OrderDetailStatus,
    userId: string,
    notes?: string,
    orderId?: number
  ) {
    await this.client.$transaction(async (tx) => {
      const detail = await tx.orderDetail.findFirst({
        where: { id, ...(orderId === undefined ? {} : { orderId }) },
      });
      if (!detail) throw new NotFoundException('Order detail not found');
      const order = await tx.order.findUnique({ where: { id: detail.orderId } });
      if (!order) throw new NotFoundException('Order not found');
      if (order.status === 'served' || order.status === 'canceled') {
        throw new BadRequestException('Cannot change details of a completed order');
      }

      const transitions: Record<string, string[]> = {
        pending: ['in_preparation', 'canceled'],
        in_preparation: ['ready', 'canceled'],
        ready: ['served', 'canceled'],
        served: [],
        canceled: [],
      };
      if (detail.state === status) return;
      if (!transitions[detail.state]?.includes(status)) {
        throw new BadRequestException(`Cannot change detail from ${detail.state} to ${status}`);
      }

      const now = new Date();
      await tx.orderDetail.update({
        where: { id },
        data: {
          state: status,
          ...(status === 'served' && { completedAt: now }),
          ...(status === 'canceled' && { canceledAt: now }),
        },
      });
      await tx.orderDetailStateHistory.create({
        data: {
          orderDetailId: id,
          userId,
          oldState: detail.state,
          newState: status,
          notes,
        },
      });

      if (status === 'in_preparation' && order.status === 'open') {
        await tx.order.update({ where: { id: order.id }, data: { status: 'in_preparation' } });
        await tx.orderStateHistory.create({
          data: {
            orderId: order.id,
            userId,
            oldState: order.status,
            newState: 'in_preparation',
            notes: 'Preparación iniciada',
          },
        });
      }

      const details = await tx.orderDetail.findMany({ where: { orderId: order.id } });
      const activeDetails = details.filter((item) => item.state !== 'canceled');
      if (
        activeDetails.length > 0 &&
        activeDetails.every((item) => item.state === 'ready' || item.state === 'served') &&
        (order.status === 'open' || order.status === 'in_preparation')
      ) {
        await tx.order.update({ where: { id: order.id }, data: { status: 'ready' } });
        await tx.orderStateHistory.create({
          data: {
            orderId: order.id,
            userId,
            oldState: order.status,
            newState: 'ready',
            notes: 'Todos los productos listos',
          },
        });
      } else if (activeDetails.length === 0 && details.length > 0) {
        await tx.order.update({
          where: { id: order.id },
          data: { status: 'canceled', canceledAt: now },
        });
        await tx.orderStateHistory.create({
          data: {
            orderId: order.id,
            userId,
            oldState: order.status,
            newState: 'canceled',
            notes: 'Todos los productos fueron cancelados',
          },
        });
        const dineIn = await tx.dineInOrder.findUnique({ where: { orderId: order.id } });
        if (dineIn) {
          await tx.restaurantTable.update({
            where: { id: dineIn.tableId },
            data: { state: 'available' },
          });
        }
      } else if (
        activeDetails.length > 0 &&
        activeDetails.every((item) => item.state === 'served') &&
        order.status === 'ready'
      ) {
        await tx.order.update({
          where: { id: order.id },
          data: { status: 'served', completedAt: now },
        });
        await tx.orderStateHistory.create({
          data: {
            orderId: order.id,
            userId,
            oldState: 'ready',
            newState: 'served',
            notes: 'Todos los productos fueron servidos',
          },
        });
        const dineIn = await tx.dineInOrder.findUnique({ where: { orderId: order.id } });
        if (dineIn) {
          await tx.restaurantTable.update({
            where: { id: dineIn.tableId },
            data: { state: 'available' },
          });
        }
      }
    });

    return this.findById(id, orderId);
  }

  async delete(id: number, orderId?: number) {
    return this.client.$transaction(async (tx) => {
      const detail = await tx.orderDetail.findFirst({
        where: { id, ...(orderId === undefined ? {} : { orderId }) },
      });
      if (!detail) throw new NotFoundException('Order detail not found');

      const order = await tx.order.findUnique({ where: { id: detail.orderId } });
      if (!order) throw new NotFoundException('Order not found');
      if (order.status !== 'open') throw new BadRequestException('Cannot edit a non-open order');

      const subtotal = Number(order.subtotal) - Number(detail.unitPrice) * detail.amount;
      const totals = calculateOrderTotals(subtotal, Number(order.taxRate), Number(order.discount));
      await tx.orderDetail.delete({ where: { id } });
      await tx.order.update({ where: { id: order.id }, data: totals });
    });
  }
}
