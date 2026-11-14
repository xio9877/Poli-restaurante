import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class HistoryService {
  constructor(private prisma: PrismaService) {}

  private get client() {
    return this.prisma.client;
  }

  async getOrderStateHistory(orderId: number) {
    return this.client.orderStateHistory.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' },
      include: { user: true },
    });
  }

  async getDetailStateHistory(orderDetailId: number) {
    return this.client.orderDetailStateHistory.findMany({
      where: { orderDetailId },
      orderBy: { createdAt: 'asc' },
      include: { user: true },
    });
  }

  async getUserActivity(userId: string, limit = 50) {
    const safeLimit = Math.min(100, Math.max(1, Math.trunc(Number(limit) || 50)));
    const [orderHistory, detailHistory] = await Promise.all([
      this.client.orderStateHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: safeLimit,
      }),
      this.client.orderDetailStateHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: safeLimit,
      }),
    ]);

    return { orderHistory, detailHistory };
  }
}
