import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PaginatedResultDto } from '../../common/dto/pagination.dto';

@Injectable()
export class DeliveryService {
  constructor(private prisma: PrismaService) {}

  private get client() {
    return this.prisma.client;
  }

  async findAll() {
    return this.client.deliveryOrder.findMany();
  }

  async findById(orderId: number) {
    return this.client.deliveryOrder.findUnique({ where: { orderId } });
  }

  async findByStatus(status: string) {
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
    return this.client.deliveryOrder.create({
      data: {
        orderId: data.orderId,
        customerId: data.customerId,
        addressId: data.addressId,
        domiciliaryId: data.domiciliaryId,
        deliveryFee: data.deliveryFee,
        status: 'pending',
      },
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

      const subtotal = products.reduce(
        (sum, { detail, product }) => sum + Number(product.price) * detail.amount,
        0
      );
      const taxRate = 0.19;
      const taxAmount = subtotal * taxRate;
      const deliveryFee = data.deliveryFee || 0;
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

  async updateStatus(orderId: number, status: string, notes?: string) {
    const delivery = await this.client.deliveryOrder.findUnique({ where: { orderId } });
    if (!delivery) throw new Error('Delivery order not found');

    const updateData: any = { status: status as any };
    if (status === 'delivered') updateData.deliveredAt = new Date();

    await this.client.deliveryOrder.update({ where: { orderId }, data: updateData });

    if (notes) {
      await this.client.orderStateHistory.create({
        data: {
          orderId,
          userId: delivery.domiciliaryId,
          oldState: delivery.status,
          newState: status as any,
          notes,
        },
      });
    }

    return this.findById(orderId);
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
    return this.client.deliveryOrder.update({ where: { orderId }, data });
  }

  async delete(orderId: number) {
    return this.client.deliveryOrder.delete({ where: { orderId } });
  }
}
