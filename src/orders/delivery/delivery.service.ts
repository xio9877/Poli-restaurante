import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PaginatedResultDto } from '../../common/dto/pagination.dto';
import { BaseQueryDto } from '../../common/dto/query.dto';
import { DeliveryStatus } from './dto/create-delivery-order.dto';

@Injectable()
export class DeliveryService {
  constructor(private prisma: PrismaService) {}

  private get client() {
    return this.prisma.client;
  }

  async findAll(query: BaseQueryDto): Promise<PaginatedResultDto<any>> {
    const { page = 1, limit = 20 } = query;
    const [data, total] = await Promise.all([
      this.client.deliveryOrder.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { order: { createdAt: 'desc' } },
        include: {
          order: {
            include: {
              details: { include: { product: true } },
              invoice: { include: { payment: true } },
            },
          },
          customer: true,
          address: true,
          domiciliary: true,
        },
      }),
      this.client.deliveryOrder.count(),
    ]);
    return new PaginatedResultDto(data, total, page, limit);
  }

  async findById(orderId: number) {
    return this.client.deliveryOrder.findUnique({
      where: { orderId },
      include: {
        order: { include: { details: { include: { product: true } } } },
        customer: true,
        address: true,
        domiciliary: true,
      },
    });
  }

  async findByStatus(status: string) {
    if (!['pending', 'assigned', 'picked_up', 'delivered', 'canceled'].includes(status)) {
      throw new BadRequestException('Invalid delivery status');
    }
    return this.client.deliveryOrder.findMany({ where: { status: status as any } });
  }

  async findByDomiciliary(domiciliaryId: string) {
    return this.client.deliveryOrder.findMany({ where: { domiciliaryId } });
  }

  async create(data: {
    orderId: number;
    customerId: string;
    addressId: number;
    domiciliaryId: string;
    deliveryFee?: number;
  }) {
    return this.client.$transaction(async (tx) => {
      const [order, customer, address, domiciliary] = await Promise.all([
        tx.order.findUnique({
          where: { id: data.orderId },
          include: { deliveryOrder: true, dineInOrder: true, invoice: true },
        }),
        tx.customer.findUnique({ where: { id: data.customerId } }),
        tx.customerAddress.findFirst({
          where: { id: data.addressId, customerId: data.customerId },
        }),
        tx.user.findUnique({ where: { id: data.domiciliaryId } }),
      ]);
      if (!order) throw new NotFoundException('Order not found');
      if (order.deliveryOrder || order.dineInOrder)
        throw new ConflictException('Order already has a service type');
      if (order.status === 'canceled') {
        throw new BadRequestException('A canceled order cannot be assigned for delivery');
      }
      const deliveryFeeCents = Math.round((data.deliveryFee ?? 0) * 100);
      const deliveryFee = deliveryFeeCents / 100;
      if (deliveryFee && order.invoice) {
        throw new ConflictException('Delivery fee cannot change after an invoice is created');
      }
      if (!customer) throw new NotFoundException('Customer not found');
      if (!address) throw new BadRequestException('The address does not belong to this customer');
      if (!domiciliary || domiciliary.role !== 'domiciliary')
        throw new BadRequestException('Select a valid delivery worker');

      const delivery = await tx.deliveryOrder.create({
        data: {
          orderId: data.orderId,
          customerId: customer.id,
          addressId: address.id,
          domiciliaryId: domiciliary.id,
          deliveryFee,
          status: 'pending',
        },
      });
      if (deliveryFee) {
        const orderTotalCents = Math.round(Number(order.total) * 100);
        await tx.order.update({
          where: { id: order.id },
          data: { total: (orderTotalCents + deliveryFeeCents) / 100 },
        });
      }
      return delivery;
    });
  }

  async createOrder(
    data: {
      customerId: string;
      addressId: number;
      domiciliaryId: string;
      deliveryFee?: number;
      notes?: string;
      details: { productId: number; amount: number; notes?: string }[];
    },
    userId: string
  ) {
    return this.client.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({ where: { id: data.customerId } });
      if (!customer) throw new NotFoundException('Customer not found');

      const address = await tx.customerAddress.findFirst({
        where: { id: data.addressId, customerId: data.customerId },
      });
      if (!address) throw new BadRequestException('The address does not belong to this customer');

      const domiciliary = await tx.user.findUnique({ where: { id: data.domiciliaryId } });
      if (!domiciliary || domiciliary.role !== 'domiciliary') {
        throw new BadRequestException('Select a valid delivery worker');
      }

      const products = await Promise.all(
        data.details.map(async (detail) => {
          const product = await tx.product.findUnique({ where: { id: detail.productId } });
          if (!product || product.status !== 'available') {
            throw new BadRequestException(`Product ${detail.productId} is not available`);
          }
          return { detail, product };
        })
      );

      const subtotalInCents = products.reduce(
        (sum, { detail, product }) => sum + Math.round(Number(product.price) * 100) * detail.amount,
        0
      );
      const subtotal = subtotalInCents / 100;
      const taxRate = 0.19;
      const taxAmount = Math.round(subtotalInCents * taxRate) / 100;
      const deliveryFee = Math.round((data.deliveryFee ?? 0) * 100) / 100;
      const total = subtotal + taxAmount + deliveryFee;

      const order = await tx.order.create({
        data: {
          subtotal,
          taxRate,
          taxAmount,
          discount: 0,
          total,
          notes: data.notes,
          status: 'open',
          details: {
            create: products.map(({ detail, product }) => ({
              productId: product.id,
              amount: detail.amount,
              unitPrice: product.price,
              notes: detail.notes,
              state: 'pending',
            })),
          },
        },
      });

      await tx.deliveryOrder.create({
        data: {
          orderId: order.id,
          customerId: customer.id,
          addressId: address.id,
          domiciliaryId: domiciliary.id,
          deliveryFee,
          status: 'pending',
          createdAt: new Date(),
        },
      });
      await tx.orderStateHistory.create({
        data: { orderId: order.id, userId, newState: 'open', notes: 'Orden a domicilio creada' },
      });

      return tx.order.findUnique({
        where: { id: order.id },
        include: {
          details: { include: { product: true } },
          deliveryOrder: { include: { customer: true, address: true, domiciliary: true } },
        },
      });
    });
  }

  async updateStatus(orderId: number, status: DeliveryStatus, notes?: string) {
    const validTransitions: Record<DeliveryStatus, DeliveryStatus[]> = {
      pending: ['assigned', 'canceled'],
      assigned: ['picked_up', 'canceled'],
      picked_up: ['delivered', 'canceled'],
      delivered: [],
      canceled: [],
    };
    return this.client.$transaction(async (tx) => {
      const delivery = await tx.deliveryOrder.findUnique({ where: { orderId } });
      if (!delivery) throw new NotFoundException('Delivery order not found');
      if (delivery.status === status) return delivery;
      if (!validTransitions[delivery.status]?.includes(status)) {
        throw new ConflictException(`Cannot move delivery from ${delivery.status} to ${status}`);
      }

      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { invoice: { include: { payment: true } } },
      });
      if (!order) throw new NotFoundException('Order not found');
      const canceled = status === 'canceled';
      if (order.status === 'canceled' && !canceled) {
        throw new ConflictException('A canceled order cannot resume delivery');
      }
      if (canceled && order.status === 'served') {
        throw new ConflictException('A completed order cannot be canceled');
      }
      if (canceled && order.invoice?.payment?.status === 'completed') {
        throw new ConflictException('A paid order cannot be canceled');
      }
      const nextOrderStatus = canceled
        ? 'canceled'
        : status === 'delivered'
          ? 'served'
          : order.status;
      const updated = await tx.deliveryOrder.update({
        where: { orderId },
        data: {
          status,
          updatedAt: new Date(),
          ...(status === 'delivered' && { deliveredAt: new Date() }),
        },
      });
      if (nextOrderStatus !== order.status) {
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: nextOrderStatus,
            ...(canceled && { canceledAt: new Date() }),
            ...(status === 'delivered' && { completedAt: new Date() }),
          },
        });
      }
      if (canceled && order.invoice && order.invoice.status !== 'canceled') {
        await tx.invoice.update({
          where: { id: order.invoice.id },
          data: { status: 'canceled' },
        });
      }
      await tx.orderStateHistory.create({
        data: {
          orderId,
          userId: delivery.domiciliaryId,
          notes: `Domicilio ${delivery.status} → ${status}${notes ? `: ${notes}` : ''}`,
          oldState: order.status,
          newState: nextOrderStatus,
        },
      });
      return updated;
    });
  }

  async update(
    orderId: number,
    data: Partial<{
      customerId: string;
      addressId: number;
      domiciliaryId: string;
      deliveryFee: number;
    }>
  ) {
    return this.client.$transaction(async (tx) => {
      const delivery = await tx.deliveryOrder.findUnique({
        where: { orderId },
        include: { order: { include: { invoice: true } } },
      });
      if (!delivery) throw new NotFoundException('Delivery order not found');
      const customerId = data.customerId ?? delivery.customerId;
      const addressId = data.addressId ?? delivery.addressId;
      if (data.customerId || data.addressId) {
        const address = await tx.customerAddress.findFirst({
          where: { id: addressId, customerId },
        });
        if (!address) throw new BadRequestException('The address does not belong to this customer');
      }
      if (data.domiciliaryId) {
        const user = await tx.user.findUnique({ where: { id: data.domiciliaryId } });
        if (!user || user.role !== 'domiciliary')
          throw new BadRequestException('Select a valid delivery worker');
      }

      let deliveryFee: number | undefined;
      if (data.deliveryFee !== undefined) {
        const deliveryFeeCents = Math.round(data.deliveryFee * 100);
        const previousFeeCents = Math.round(Number(delivery.deliveryFee ?? 0) * 100);
        deliveryFee = deliveryFeeCents / 100;
        if (deliveryFeeCents !== previousFeeCents) {
          if (delivery.order.invoice) {
            throw new ConflictException('Delivery fee cannot change after an invoice is created');
          }
          const orderTotalCents = Math.round(Number(delivery.order.total) * 100);
          await tx.order.update({
            where: { id: orderId },
            data: { total: (orderTotalCents + deliveryFeeCents - previousFeeCents) / 100 },
          });
        }
      }

      return tx.deliveryOrder.update({
        where: { orderId },
        data: {
          ...data,
          ...(deliveryFee !== undefined && { deliveryFee }),
          updatedAt: new Date(),
        },
      });
    });
  }

  async delete(orderId: number) {
    return this.client.deliveryOrder.delete({ where: { orderId } });
  }
}
