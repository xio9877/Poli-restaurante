import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class TablesService {
  constructor(private prisma: PrismaService) {}

  private get client() {
    return this.prisma.client;
  }

  async findAll() {
    return this.client.restaurantTable.findMany();
  }

  async findAvailable() {
    return this.client.restaurantTable.findMany({ where: { state: 'available' } });
  }

  async findById(id: number) {
    return this.client.restaurantTable.findUnique({ where: { id } });
  }

  async create(data: { name: string; description?: string; state?: string }) {
    return this.client.restaurantTable.create({
      data: {
        name: data.name,
        description: data.description,
        state: (data.state as any) || 'available',
      },
    });
  }

  async update(id: number, data: Partial<{ name: string; description: string; state: string }>) {
    return this.client.restaurantTable.update({
      where: { id },
      data: data as any,
    });
  }

  async updateState(id: number, state: string) {
    return this.client.restaurantTable.update({
      where: { id },
      data: { state: state as any },
    });
  }

  async delete(id: number) {
    return this.client.restaurantTable.delete({ where: { id } });
  }
}
