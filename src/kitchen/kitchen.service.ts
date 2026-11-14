import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PaginatedResultDto } from '../common/dto/pagination.dto';

@Injectable()
export class KitchenService {
  constructor(private prisma: PrismaService) {}

  private get client() {
    return this.prisma.client;
  }

  async getKitchenOrders(): Promise<PaginatedResultDto<any>> {
    const orders = await this.client.order.findMany({
      where: { status: { in: ['open', 'in_preparation'] } },
      orderBy: { createdAt: 'asc' },
    });

    const ordersWithDetails = await Promise.all(
      orders.map(async (order) => {
        const details = await this.client.orderDetail.findMany({
          where: { orderId: order.id },
          include: { product: true },
        });
        const dineIn = await this.client.dineInOrder.findUnique({ where: { orderId: order.id } });
        let tableName = null;
        if (dineIn) {
          const table = await this.client.restaurantTable.findUnique({
            where: { id: dineIn.tableId },
          });
          tableName = table?.name;
        }
        return { ...order, details, tableName };
      })
    );

    return new PaginatedResultDto(
      ordersWithDetails,
      ordersWithDetails.length,
      1,
      ordersWithDetails.length
    );
  }

  async getOrderForKitchen(id: number) {
    const order = await this.client.order.findUnique({ where: { id } });
    if (!order) return null;

    const details = await this.client.orderDetail.findMany({ where: { orderId: id } });
    const dineIn = await this.client.dineInOrder.findUnique({ where: { orderId: id } });
    let tableName = null;
    if (dineIn) {
      const table = await this.client.restaurantTable.findUnique({ where: { id: dineIn.tableId } });
      tableName = table?.name;
    }

    return { ...order, details, tableName };
  }

  async getPendingDetails(): Promise<PaginatedResultDto<any>> {
    const details = await this.client.orderDetail.findMany({
      where: { state: { in: ['pending', 'in_preparation'] } },
      orderBy: { createdAt: 'asc' },
    });

    const detailsWithInfo = await Promise.all(
      details.map(async (detail) => {
        const product = await this.client.product.findUnique({ where: { id: detail.productId } });
        const order = await this.client.order.findUnique({ where: { id: detail.orderId } });
        let tableName = null;
        if (order) {
          const dineIn = await this.client.dineInOrder.findUnique({ where: { orderId: order.id } });
          if (dineIn) {
            const table = await this.client.restaurantTable.findUnique({
              where: { id: dineIn.tableId },
            });
            tableName = table?.name;
          }
        }
        return { ...detail, product, order, tableName };
      })
    );

    return new PaginatedResultDto(
      detailsWithInfo,
      detailsWithInfo.length,
      1,
      detailsWithInfo.length
    );
  }

  async updateDetailStatus(id: number, status: string, userId: string, notes?: string) {
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

      if (status === 'ready') {
        const orderDetails = await tx.orderDetail.findMany({ where: { orderId: detail.orderId } });
        const allReady = orderDetails.every((d) => d.state === 'ready' || d.state === 'served');
        if (allReady) {
          await tx.order.update({ where: { id: detail.orderId }, data: { status: 'ready' } });
          await tx.orderStateHistory.create({
            data: {
              orderId: detail.orderId,
              userId,
              oldState: 'in_preparation',
              newState: 'ready',
              notes: 'Todos los productos listos',
            },
          });
        }
      }
    });

    return this.findById(id);
  }

  async findById(id: number) {
    return this.client.orderDetail.findUnique({ where: { id } });
  }

  async getPrepStats() {
    const history = await this.client.orderDetailStateHistory.findMany({
      where: { newState: { in: ['ready', 'served'] } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const times = await Promise.all(
      history
        .filter((h) => h.oldState === 'in_preparation' || h.oldState === 'pending')
        .map(async (h) => {
          const detail = await this.client.orderDetail.findUnique({
            where: { id: h.orderDetailId },
          });
          if (!detail) return null;
          const product = await this.client.product.findUnique({ where: { id: detail.productId } });
          const order = await this.client.order.findUnique({ where: { id: detail.orderId } });
          if (!order || order.status !== 'served') return null;
          const start = new Date(detail.createdAt).getTime();
          const end = new Date(h.createdAt).getTime();
          const minutes = (end - start) / 1000 / 60;
          if (minutes <= 0 || minutes > 120) return null;
          return { product: product?.name, minutes, orderId: detail.orderId };
        })
    );

    const validTimes = times.filter((t) => t !== null);

    if (validTimes.length === 0)
      return { avgPrepTime: 0, minPrepTime: 0, maxPrepTime: 0, samples: 0 };

    return {
      avgPrepTime: Math.round(validTimes.reduce((a, b) => a + b.minutes, 0) / validTimes.length),
      minPrepTime: Math.round(Math.min(...validTimes.map((t) => t.minutes))),
      maxPrepTime: Math.round(Math.max(...validTimes.map((t) => t.minutes))),
      samples: validTimes.length,
    };
  }
}
