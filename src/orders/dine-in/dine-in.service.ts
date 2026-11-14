import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PaginatedResultDto } from '../../common/dto/pagination.dto';
import { BaseQueryDto } from '../../common/dto/query.dto';

@Injectable()
export class DineInService {
  constructor(private prisma: PrismaService) {}

  private get client() {
    return this.prisma.client;
  }

  async findAll(query: BaseQueryDto): Promise<PaginatedResultDto<any>> {
    const { page = 1, limit = 20, orderBy = 'createdAt', orderDir = 'desc' } = query;
    const sortField = ['orderId', 'tableId', 'guestCount'].includes(orderBy) ? orderBy : 'orderId';
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.client.dineInOrder.findMany({
        orderBy: { [sortField]: orderDir },
        skip,
        take: limit,
        include: {
          table: true,
          waiter: true,
          order: { include: { details: { include: { product: true } } } },
        },
      }),
      this.client.dineInOrder.count(),
    ]);

    return new PaginatedResultDto(data, total, page, limit);
  }

  async findById(orderId: number) {
    return this.client.dineInOrder.findUnique({
      where: { orderId },
      include: {
        table: true,
        waiter: true,
        order: { include: { details: { include: { product: true } } } },
      },
    });
  }

  async create(dto: { orderId: number; tableId: number; guestCount?: number }, waiterId: string) {
    return this.client.$transaction(async (tx) => {
      const table = await tx.restaurantTable.findUnique({ where: { id: dto.tableId } });
      if (!table) throw new NotFoundException('Table not found');
      const claim = await tx.restaurantTable.updateMany({
        where: { id: dto.tableId, state: 'available' },
        data: { state: 'unavailable' },
      });
      if (!claim.count) throw new ConflictException('Table is not available');

      const order = await tx.order.findUnique({
        where: { id: dto.orderId },
        include: { dineInOrder: true, deliveryOrder: true },
      });
      if (!order) throw new NotFoundException('Order not found');
      if (order.dineInOrder || order.deliveryOrder)
        throw new ConflictException('Order already has a service type');

      const dineIn = await tx.dineInOrder.create({
        data: { orderId: dto.orderId, tableId: dto.tableId, waiterId, guestCount: dto.guestCount },
      });

      await tx.orderStateHistory.create({
        data: {
          orderId: dto.orderId,
          userId: waiterId,
          oldState: null,
          newState: 'open',
          notes: `Mesa ${table.name} asignada`,
        },
      });

      return dineIn;
    });
  }

  async createOrder(
    dto: {
      tableId: number;
      guestCount?: number;
      notes?: string;
      details: { productId: number; amount: number; notes?: string }[];
    },
    waiterId: string
  ) {
    return this.client.$transaction(async (tx) => {
      const table = await tx.restaurantTable.findUnique({ where: { id: dto.tableId } });
      if (!table) throw new NotFoundException('Table not found');
      const claim = await tx.restaurantTable.updateMany({
        where: { id: dto.tableId, state: 'available' },
        data: { state: 'unavailable' },
      });
      if (!claim.count) throw new ConflictException('Table is not available');

      const products = await Promise.all(
        dto.details.map(async (detail) => {
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
      const taxAmount = Math.round(subtotalInCents * 0.19) / 100;
      const order = await tx.order.create({
        data: {
          subtotal,
          taxRate: 0.19,
          taxAmount,
          discount: 0,
          total: subtotal + taxAmount,
          notes: dto.notes,
          status: 'open',
          details: {
            create: products.map(({ detail, product }) => ({
              productId: product.id,
              amount: detail.amount,
              unitPrice: product.price,
              notes: detail.notes,
            })),
          },
        },
      });

      await tx.dineInOrder.create({
        data: {
          orderId: order.id,
          tableId: dto.tableId,
          waiterId,
          guestCount: dto.guestCount,
        },
      });
      await tx.orderStateHistory.create({
        data: {
          orderId: order.id,
          userId: waiterId,
          newState: 'open',
          notes: `Orden en mesa ${table.name} creada`,
        },
      });

      return tx.order.findUnique({
        where: { id: order.id },
        include: {
          details: { include: { product: true } },
          dineInOrder: { include: { table: true, waiter: true } },
        },
      });
    });
  }

  async update(orderId: number, data: { tableId?: number; guestCount?: number }) {
    const current = await this.client.dineInOrder.findUnique({ where: { orderId } });
    if (!current) throw new NotFoundException('Dine-in order not found');

    if (data.tableId && data.tableId !== current.tableId) {
      return this.client.$transaction(async (tx) => {
        const newTable = await tx.restaurantTable.findUnique({ where: { id: data.tableId } });
        if (!newTable) throw new NotFoundException('New table not found');
        const claim = await tx.restaurantTable.updateMany({
          where: { id: data.tableId, state: 'available' },
          data: { state: 'unavailable' },
        });
        if (!claim.count) throw new ConflictException('New table is not available');
        await tx.restaurantTable.update({
          where: { id: current.tableId },
          data: { state: 'available' },
        });
        await tx.dineInOrder.update({
          where: { orderId },
          data: {
            tableId: data.tableId,
            ...(data.guestCount !== undefined && { guestCount: data.guestCount }),
          },
        });
        return tx.dineInOrder.findUnique({
          where: { orderId },
          include: { table: true, waiter: true, order: { include: { details: true } } },
        });
      });
    }

    return this.client.dineInOrder.update({
      where: { orderId },
      data: { ...(data.guestCount !== undefined && { guestCount: data.guestCount }) },
    });
  }

  async delete(orderId: number) {
    return this.client.$transaction(async (tx) => {
      const current = await tx.dineInOrder.findUnique({ where: { orderId } });
      if (!current) throw new NotFoundException('Dine-in order not found');
      await tx.restaurantTable.update({
        where: { id: current.tableId },
        data: { state: 'available' },
      });
      return tx.dineInOrder.delete({ where: { orderId } });
    });
  }
}
