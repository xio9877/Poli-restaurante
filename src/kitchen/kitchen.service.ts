import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PaginatedResultDto } from '../common/dto/pagination.dto';
import { DetailsService } from '../orders/details/details.service';
import { OrderDetailStatus } from '../orders/details/dto/detail.dto';

@Injectable()
export class KitchenService {
  constructor(
    private prisma: PrismaService,
    private detailsService: DetailsService
  ) {}

  private get client() {
    return this.prisma.client;
  }

  async getKitchenOrders(): Promise<PaginatedResultDto<any>> {
    const orders = await this.client.order.findMany({
      where: { status: { in: ['open', 'in_preparation'] } },
      orderBy: { createdAt: 'asc' },
      include: {
        details: { include: { product: true } },
        dineInOrder: { include: { table: true } },
      },
    });
    const data = orders.map((order) => ({
      ...order,
      tableName: order.dineInOrder?.table.name ?? null,
    }));

    return new PaginatedResultDto(data, data.length, 1, Math.max(data.length, 1));
  }

  async getOrderForKitchen(id: number) {
    const order = await this.client.order.findUnique({
      where: { id },
      include: {
        details: { include: { product: true } },
        dineInOrder: { include: { table: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    return {
      ...order,
      tableName: order.dineInOrder?.table.name ?? null,
    };
  }

  async getPendingDetails(): Promise<PaginatedResultDto<any>> {
    const details = await this.client.orderDetail.findMany({
      where: {
        state: { in: ['pending', 'in_preparation'] },
        order: { status: { in: ['open', 'in_preparation'] } },
      },
      orderBy: { createdAt: 'asc' },
      include: {
        product: true,
        order: { include: { dineInOrder: { include: { table: true } } } },
      },
    });
    const data = details.map((detail) => ({
      ...detail,
      tableName: detail.order.dineInOrder?.table.name ?? null,
    }));

    return new PaginatedResultDto(data, data.length, 1, Math.max(data.length, 1));
  }

  async updateDetailStatus(id: number, status: OrderDetailStatus, userId: string, notes?: string) {
    return this.detailsService.updateStatus(id, status, userId, notes);
  }

  async getPrepStats() {
    const completedDetails = await this.client.orderDetailStateHistory.findMany({
      where: {
        oldState: 'in_preparation',
        newState: 'ready',
        orderDetail: { order: { status: 'served' } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { orderDetail: { include: { product: true } } },
    });

    if (completedDetails.length === 0) {
      return { avgPrepTime: 0, minPrepTime: 0, maxPrepTime: 0, samples: 0 };
    }

    const detailIds = [...new Set(completedDetails.map((history) => history.orderDetailId))];
    const preparationStarts = await this.client.orderDetailStateHistory.findMany({
      where: {
        orderDetailId: { in: detailIds },
        newState: 'in_preparation',
      },
      orderBy: { createdAt: 'asc' },
      select: { orderDetailId: true, createdAt: true },
    });
    const startByDetail = new Map<number, Date>();
    for (const history of preparationStarts) {
      if (!startByDetail.has(history.orderDetailId)) {
        startByDetail.set(history.orderDetailId, history.createdAt);
      }
    }

    const minutes = completedDetails
      .map((history) => {
        const start = startByDetail.get(history.orderDetailId) ?? history.orderDetail.createdAt;
        return (history.createdAt.getTime() - start.getTime()) / 60_000;
      })
      .filter((value) => value > 0 && value <= 120);

    if (minutes.length === 0) {
      return { avgPrepTime: 0, minPrepTime: 0, maxPrepTime: 0, samples: 0 };
    }

    return {
      avgPrepTime: Math.round(minutes.reduce((sum, value) => sum + value, 0) / minutes.length),
      minPrepTime: Math.round(Math.min(...minutes)),
      maxPrepTime: Math.round(Math.max(...minutes)),
      samples: minutes.length,
    };
  }
}
