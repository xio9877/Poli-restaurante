import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class HistoryService {
  constructor(private prisma: PrismaService) {}

  private get client() {
    return this.prisma.client;
  }

  async getOrderStateHistory(orderId: number) {
    return this.client.orderStateHistory.findMany({ where: { orderId } });
  }

  async getDetailStateHistory(orderDetailId: number) {
    return this.client.orderDetailStateHistory.findMany({ where: { orderDetailId } });
  }

  async getUserActivity(userId: string, limit = 50) {
    const [orderHistory, detailHistory] = await Promise.all([
      this.client.orderStateHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.client.orderDetailStateHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
    ]);

    return { orderHistory, detailHistory };
  }
}
