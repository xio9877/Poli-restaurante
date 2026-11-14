import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PaginatedResultDto } from '../common/dto/pagination.dto';
import { ProductQueryDto } from '../common/dto/query.dto';
import { TableQueryDto } from '../tables/dto/table.dto';
import { UserQueryDto } from '../users/dto/user.dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  private get client() {
    return this.prisma.client;
  }

  // ==================== PRODUCTOS ====================
  async createProduct(dto: any) {
    return this.client.product.create({
      data: {
        categoryId: dto.categoryId,
        name: dto.name,
        description: dto.description,
        price: dto.price,
        status: dto.status || 'available',
      },
    });
  }

  async getProducts(query: ProductQueryDto): Promise<PaginatedResultDto<any>> {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      categoryId,
      orderBy = 'createdAt',
      orderDir = 'desc',
    } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (categoryId) where.categoryId = categoryId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.client.product.findMany({ where, orderBy: { [orderBy]: orderDir }, skip, take: limit }),
      this.client.product.count({ where }),
    ]);

    return new PaginatedResultDto(data, total, page, limit);
  }

  async getProduct(id: number) {
    const product = await this.client.product.findUnique({ where: { id } });
    if (!product) return null;
    const category = await this.client.category.findUnique({ where: { id: product.categoryId } });
    return { ...product, category };
  }

  async updateProduct(id: number, dto: any) {
    return this.client.product.update({ where: { id }, data: dto });
  }

  async updateProductStatus(id: number, status: string) {
    return this.client.product.update({ where: { id }, data: { status: status as any } });
  }

  async deleteProduct(id: number) {
    return this.client.product.update({ where: { id }, data: { status: 'unavailable' } });
  }

  // ==================== MESAS ====================
  async createTable(dto: any) {
    return this.client.restaurantTable.create({
      data: { name: dto.name, description: dto.description, state: 'available' },
    });
  }

  async getTables(query: TableQueryDto): Promise<PaginatedResultDto<any>> {
    const { page = 1, limit = 20, search, state, orderBy = 'createdAt', orderDir = 'desc' } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (state) where.state = state;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.client.restaurantTable.findMany({
        where,
        orderBy: { [orderBy]: orderDir },
        skip,
        take: limit,
      }),
      this.client.restaurantTable.count({ where }),
    ]);

    return new PaginatedResultDto(data, total, page, limit);
  }

  async getTable(id: number) {
    return this.client.restaurantTable.findUnique({ where: { id } });
  }

  async updateTable(id: number, dto: any) {
    return this.client.restaurantTable.update({ where: { id }, data: dto });
  }

  async updateTableState(id: number, state: string) {
    return this.client.restaurantTable.update({ where: { id }, data: { state: state as any } });
  }

  async deleteTable(id: number) {
    const table = await this.client.restaurantTable.findUnique({ where: { id } });
    if (table?.state === 'unavailable') throw new Error('Cannot delete table with active orders');
    return this.client.restaurantTable.update({ where: { id }, data: { state: 'unavailable' } });
  }

  // ==================== USUARIOS ====================
  async createUser(dto: any) {
    return this.client.user.create({
      data: { name: dto.name, username: dto.username, role: dto.role },
    });
  }

  async getUsers(query: UserQueryDto): Promise<PaginatedResultDto<any>> {
    const { page = 1, limit = 20, search, role, orderBy = 'createdAt', orderDir = 'desc' } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.client.user.findMany({ where, orderBy: { [orderBy]: orderDir }, skip, take: limit }),
      this.client.user.count({ where }),
    ]);

    return new PaginatedResultDto(data, total, page, limit);
  }

  async getUser(id: string) {
    return this.client.user.findUnique({ where: { id } });
  }

  async updateUser(id: string, dto: any) {
    return this.client.user.update({ where: { id }, data: dto });
  }

  async deleteUser(id: string) {
    return this.client.user.update({ where: { id }, data: { role: 'waiter' } });
  }

  // ==================== REPORTES ====================
  async getSalesReport(startDate?: string, endDate?: string) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const orders = await this.client.order.findMany({
      where: { status: 'served', createdAt: { gte: start, lte: end } },
    });

    const totalSales = orders.reduce((sum, o) => sum + Number(o.total), 0);
    const totalOrders = orders.length;
    const avgTicket = totalOrders > 0 ? totalSales / totalOrders : 0;

    const byDay: Record<string, { orders: number; total: number }> = {};
    orders.forEach((o) => {
      const day = new Date(o.createdAt).toISOString().split('T')[0];
      if (!byDay[day]) byDay[day] = { orders: 0, total: 0 };
      byDay[day].orders++;
      byDay[day].total += Number(o.total);
    });

    const topProducts = await this.getTopProducts(start, end);

    return {
      period: { start: start.toISOString(), end: end.toISOString() },
      summary: { totalSales, totalOrders, avgTicket: Math.round(avgTicket) },
      byDay: Object.entries(byDay).map(([date, data]) => ({ date, ...data })),
      topProducts,
    };
  }

  async getTopProducts(start: Date, end: Date, limit = 10) {
    const details = await this.client.orderDetail.findMany({
      where: { order: { status: 'served', createdAt: { gte: start, lte: end } } },
    });

    const productStats: Record<number, { name: string; count: number; revenue: number }> = {};
    for (const d of details) {
      const p = await this.client.product.findUnique({ where: { id: d.productId } });
      if (!p) continue;
      if (!productStats[d.productId])
        productStats[d.productId] = { name: p.name, count: 0, revenue: 0 };
      productStats[d.productId].count += d.amount;
      productStats[d.productId].revenue += Number(d.unitPrice) * d.amount;
    }

    return Object.entries(productStats)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, limit)
      .map(([id, data]) => ({ productId: parseInt(id), ...data }));
  }

  async getPrepTimeReport(startDate?: string, endDate?: string) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const history = await this.client.orderDetailStateHistory.findMany({
      where: { newState: { in: ['ready', 'served'] }, createdAt: { gte: start, lte: end } },
    });

    const prepTimes = await Promise.all(
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

    const validTimes = prepTimes.filter((t) => t !== null);

    if (validTimes.length === 0) return { avgPrepTime: 0, byProduct: [], totalSamples: 0 };

    const byProduct: Record<string, number[]> = {};
    validTimes.forEach((t) => {
      if (!byProduct[t.product]) byProduct[t.product] = [];
      byProduct[t.product].push(t.minutes);
    });

    return {
      avgPrepTime: Math.round(validTimes.reduce((a, b) => a + b.minutes, 0) / validTimes.length),
      totalSamples: validTimes.length,
      byProduct: Object.entries(byProduct)
        .map(([product, times]) => ({
          product,
          avgTime: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
          minTime: Math.round(Math.min(...times)),
          maxTime: Math.round(Math.max(...times)),
          samples: times.length,
        }))
        .sort((a, b) => b.avgTime - a.avgTime),
    };
  }
}
