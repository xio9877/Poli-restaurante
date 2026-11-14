import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PaginatedResultDto } from '../../common/dto/pagination.dto';

@Injectable()
export class DineInService {
  constructor(private prisma: PrismaService) {}

  private get client() {
    return this.prisma.client;
  }

  async findAll(query: any): Promise<PaginatedResultDto<any>> {
    const { page = 1, limit = 20, orderBy = 'createdAt', orderDir = 'desc' } = query;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.client.dineInOrder.findMany({
        orderBy: { [orderBy]: orderDir },
        skip,
        take: limit,
      }),
      this.client.dineInOrder.count(),
    ]);

    return new PaginatedResultDto(data, total, page, limit);
  }

  async findById(orderId: number) {
    return this.client.dineInOrder.findUnique({ where: { orderId } });
  }

  async create(dto: { orderId: number; tableId: number; guestCount?: number }, waiterId: string) {
    const table = await this.client.restaurantTable.findUnique({ where: { id: dto.tableId } });
    if (!table) throw new Error('Table not found');
    if (table.state !== 'available') throw new Error('Table is not available');

    return this.client.$transaction(async (tx) => {
      await tx.restaurantTable.update({
        where: { id: dto.tableId },
        data: { state: 'unavailable' },
      });

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

  async update(orderId: number, data: { tableId?: number; guestCount?: number }) {
    const current = await this.client.dineInOrder.findUnique({ where: { orderId } });
    if (!current) throw new Error('Dine-in order not found');

    if (data.tableId && data.tableId !== current.tableId) {
      const newTable = await this.client.restaurantTable.findUnique({
        where: { id: data.tableId },
      });
      if (!newTable) throw new Error('New table not found');
      if (newTable.state !== 'available') throw new Error('New table is not available');

      return this.client.$transaction(async (tx) => {
        await tx.restaurantTable.update({
          where: { id: current.tableId },
          data: { state: 'available' },
        });
        await tx.restaurantTable.update({
          where: { id: data.tableId },
          data: { state: 'unavailable' },
        });
        await tx.dineInOrder.update({
          where: { orderId },
          data: { tableId: data.tableId, guestCount: data.guestCount },
        });
      });
    }

    return this.client.dineInOrder.update({
      where: { orderId },
      data: { guestCount: data.guestCount },
    });
  }

  async delete(orderId: number) {
    const current = await this.client.dineInOrder.findUnique({ where: { orderId } });
    if (current) {
      await this.client.restaurantTable.update({
        where: { id: current.tableId },
        data: { state: 'available' },
      });
    }
    return this.client.dineInOrder.delete({ where: { orderId } });
  }
}
