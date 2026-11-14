import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { PaginatedResultDto } from '@/common/dto/pagination.dto';
import { OrderQueryDto } from '@/common/dto/query.dto';
import { calculateOrderTotals } from './order-totals';
import { OrderStatus } from './dto/order.dto';

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
    if (dto.details.length === 0) throw new BadRequestException('An order must have details');

    return this.client.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: { id: { in: [...new Set(dto.details.map((detail) => detail.productId))] } },
      });
      const productsById = new Map<number, (typeof products)[number]>(
        products.map((product) => [product.id, product])
      );
      for (const detail of dto.details) {
        const product = productsById.get(detail.productId);
        if (!product) throw new NotFoundException(`Product ${detail.productId} not found`);
        if (product.status !== 'available') {
          throw new BadRequestException(`Product ${product.name} not available`);
        }
      }

      const taxRate = 0.19;
      const subtotal = dto.details.reduce((sum, detail) => {
        const product = productsById.get(detail.productId)!;
        return sum + Number(product.price) * detail.amount;
      }, 0);
      const totals = calculateOrderTotals(subtotal, taxRate);

      const order = await tx.order.create({
        data: {
          ...totals,
          taxRate,
          discount: 0,
          notes: dto.notes,
          status: 'open',
        },
      });

      await tx.orderDetail.createMany({
        data: dto.details.map((detail) => {
          const product = productsById.get(detail.productId)!;
          return {
            orderId: order.id,
            productId: detail.productId,
            amount: detail.amount,
            unitPrice: Number(product.price),
            notes: detail.notes,
            state: 'pending',
          };
        }),
      });

      await tx.orderStateHistory.create({
        data: {
          orderId: order.id,
          userId,
          oldState: null,
          newState: 'open',
          notes: 'Orden creada',
        },
      });

      return tx.order.findUnique({
        where: { id: order.id },
        include: {
          details: { include: { product: true } },
          dineInOrder: { include: { table: true, waiter: true } },
          deliveryOrder: { include: { customer: true, address: true, domiciliary: true } },
          stateHistory: { orderBy: { createdAt: 'asc' }, include: { user: true } },
          invoice: { include: { payment: true } },
        },
      });
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

    const where: { status?: string; OR?: object[] } = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { notes: { contains: search, mode: 'insensitive' } },
        { details: { some: { product: { name: { contains: search, mode: 'insensitive' } } } } },
      ];
    }

    const sortField = ['id', 'status', 'total'].includes(orderBy || '') ? orderBy! : 'createdAt';
    const [data, total] = await Promise.all([
      this.client.order.findMany({
        where,
        orderBy: { [sortField]: orderDir },
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
      where: { status: { in: ['open', 'in_preparation', 'ready'] } },
      include: { details: true, dineInOrder: true, deliveryOrder: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getOrderWithDetails(id: number) {
    const order = await this.client.order.findUnique({
      where: { id },
      include: {
        details: { include: { product: true } },
        dineInOrder: { include: { table: true, waiter: true } },
        deliveryOrder: { include: { customer: true, address: true, domiciliary: true } },
        stateHistory: { orderBy: { createdAt: 'asc' }, include: { user: true } },
        invoice: { include: { payment: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async updateStatus(id: number, status: OrderStatus, userId: string, notes?: string) {
    await this.client.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id } });
      if (!order) throw new NotFoundException('Order not found');
      if (order.status === status) return;

      const transitions: Record<string, string[]> = {
        open: ['in_preparation', 'canceled'],
        in_preparation: ['ready', 'canceled'],
        ready: ['served', 'canceled'],
        served: [],
        canceled: [],
      };
      if (!transitions[order.status]?.includes(status)) {
        throw new BadRequestException(`Cannot change order from ${order.status} to ${status}`);
      }

      const now = new Date();
      const details = await tx.orderDetail.findMany({ where: { orderId: id } });
      const activeDetails = details.filter((detail) => detail.state !== 'canceled');
      if (
        status === 'ready' &&
        (activeDetails.length === 0 ||
          !activeDetails.every((detail) => detail.state === 'ready' || detail.state === 'served'))
      ) {
        throw new BadRequestException(
          'All order details must be ready before completing the order'
        );
      }
      if (
        status === 'served' &&
        (activeDetails.length === 0 ||
          !activeDetails.every((detail) => detail.state === 'ready' || detail.state === 'served'))
      ) {
        throw new BadRequestException('All order details must be ready before serving the order');
      }

      if (status === 'canceled') {
        const cancellableDetails = details.filter(
          (detail) => detail.state !== 'served' && detail.state !== 'canceled'
        );
        for (const detail of cancellableDetails) {
          await tx.orderDetail.update({
            where: { id: detail.id },
            data: { state: 'canceled', canceledAt: now },
          });
          await tx.orderDetailStateHistory.create({
            data: {
              orderDetailId: detail.id,
              userId,
              oldState: detail.state,
              newState: 'canceled',
              notes: 'Orden cancelada',
            },
          });
        }
      } else if (status === 'served') {
        const readyDetails = activeDetails.filter((detail) => detail.state === 'ready');
        for (const detail of readyDetails) {
          await tx.orderDetail.update({
            where: { id: detail.id },
            data: { state: 'served', completedAt: now },
          });
          await tx.orderDetailStateHistory.create({
            data: {
              orderDetailId: detail.id,
              userId,
              oldState: 'ready',
              newState: 'served',
              notes: 'Orden servida',
            },
          });
        }
      }

      await tx.order.update({
        where: { id },
        data: {
          status,
          ...(status === 'served' && { completedAt: now }),
          ...(status === 'canceled' && { canceledAt: now }),
        },
      });
      await tx.orderStateHistory.create({
        data: { orderId: id, userId, oldState: order.status, newState: status, notes },
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
    if (!order) throw new NotFoundException('Order not found');

    return this.client.$transaction(async (tx) => {
      const dineIn = await tx.dineInOrder.findUnique({ where: { orderId: id } });
      if (dineIn) {
        await tx.restaurantTable.update({
          where: { id: dineIn.tableId },
          data: { state: 'available' },
        });
      }
      await tx.orderDetail.deleteMany({ where: { orderId: id } });
      await tx.orderStateHistory.deleteMany({ where: { orderId: id } });
      await tx.dineInOrder.deleteMany({ where: { orderId: id } });
      await tx.deliveryOrder.deleteMany({ where: { orderId: id } });
      await tx.invoice.deleteMany({ where: { orderId: id } });
      return tx.order.delete({ where: { id } });
    });
  }
}
