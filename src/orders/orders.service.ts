import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { PaginatedResultDto } from '@/common/dto/pagination.dto';
import { OrderQueryDto } from '@/common/dto/query.dto';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  private get client() {
    return this.prisma.client;
  }

  async createWithDetails(
    dto: { details: { productId: number; amount: number; notes?: string }[]; notes?: string },
    userId: string
  ) {
    return this.client.$transaction(async (tx) => {
      let subtotal = 0;
      for (const detail of dto.details) {
        const product = await tx.product.findUnique({ where: { id: detail.productId } });
        if (!product) throw new Error(`Product ${detail.productId} not found`);
        if (product.status !== 'available')
          throw new Error(`Product ${product.name} not available`);
        subtotal += Number(product.price) * detail.amount;
      }

      const taxRate = 0.19;
      const taxAmount = subtotal * taxRate;
      const total = subtotal + taxAmount;

      const order = await tx.order.create({
        data: {
          subtotal,
          taxRate,
          taxAmount,
          discount: 0,
          total,
          notes: dto.notes,
          status: 'open',
        },
      });

      for (const detail of dto.details) {
        const product = await tx.product.findUnique({ where: { id: detail.productId } });
        await tx.orderDetail.create({
          data: {
            orderId: order.id,
            productId: detail.productId,
            amount: detail.amount,
            unitPrice: Number(product!.price),
            notes: detail.notes,
            state: 'pending',
          },
        });
      }

      await tx.orderStateHistory.create({
        data: {
          orderId: order.id,
          userId,
          oldState: null,
          newState: 'open',
          notes: 'Orden creada',
        },
      });

      return this.getOrderWithDetails(order.id);
    });
  }

  async findAll(query: OrderQueryDto): Promise<PaginatedResultDto<any>> {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      orderBy = 'createdAt',
      orderDir = 'desc',
    } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { notes: { contains: search, mode: 'insensitive' } },
        { details: { some: { product: { name: { contains: search, mode: 'insensitive' } } } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.client.order.findMany({
        where,
        orderBy: { [orderBy]: orderDir },
        skip,
        take: limit,
        include: {
          details: true,
          dineInOrder: { include: { table: true } },
          deliveryOrder: { include: { customer: true } },
          invoice: { include: { payment: true } },
        },
      }),
      this.client.order.count({ where }),
    ]);

    return new PaginatedResultDto(data, total, page, limit);
  }

  async findOpenOrders() {
    return this.client.order.findMany({
      where: { status: 'open' },
      include: { details: true, dineInOrder: true, deliveryOrder: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getOrderWithDetails(id: number) {
    return this.client.order.findUnique({
      where: { id },
      include: {
        details: { include: { product: true } },
        dineInOrder: { include: { table: true, waiter: true } },
        deliveryOrder: { include: { customer: true, address: true, domiciliary: true } },
        stateHistory: { include: { user: true } },
        invoice: { include: { payment: true } },
      },
    });
  }

  async updateStatus(id: number, status: string, userId: string, notes?: string) {
    const order = await this.client.order.findUnique({ where: { id } });
    if (!order) throw new Error('Order not found');

    const oldState = order.status;
    const updateData: any = { status: status as any };

    if (status === 'served') updateData.completedAt = new Date();
    if (status === 'canceled') updateData.canceledAt = new Date();

    await this.client.$transaction(async (tx) => {
      await tx.order.update({ where: { id }, data: updateData });

      await tx.orderStateHistory.create({
        data: { orderId: id, userId, oldState, newState: status as any, notes },
      });

      if (status === 'canceled' || status === 'served') {
        const dineIn = await tx.dineInOrder.findUnique({ where: { orderId: id } });
        if (dineIn) {
          await tx.restaurantTable.update({
            where: { id: dineIn.tableId },
            data: { state: 'available' },
          });
        }
      }
    });

    return this.getOrderWithDetails(id);
  }

  async delete(id: number) {
    const order = await this.client.order.findUnique({ where: { id } });
    if (!order) throw new Error('Order not found');

    return this.client.$transaction(async (tx) => {
      await tx.orderDetail.deleteMany({ where: { orderId: id } });
      await tx.orderStateHistory.deleteMany({ where: { orderId: id } });
      await tx.dineInOrder.deleteMany({ where: { orderId: id } });
      await tx.deliveryOrder.deleteMany({ where: { orderId: id } });
      await tx.invoice.deleteMany({ where: { orderId: id } });
      return tx.order.delete({ where: { id } });
    });
  }
}
