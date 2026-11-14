import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  private get client() {
    return this.prisma.client;
  }

  async findAll() {
    return this.client.product.findMany();
  }

  async findAvailable() {
    return this.client.product.findMany({ where: { status: 'available' } });
  }

  async findById(id: number) {
    return this.client.product.findUnique({ where: { id } });
  }

  async findByCategory(categoryId: number) {
    return this.client.product.findMany({ where: { categoryId, status: 'available' } });
  }

  async create(data: {
    categoryId: number;
    name: string;
    description?: string;
    price: number;
    status?: string;
  }) {
    return this.client.product.create({
      data: {
        categoryId: data.categoryId,
        name: data.name,
        description: data.description,
        price: data.price,
        status: (data.status as any) || 'available',
      },
    });
  }

  async update(
    id: number,
    data: Partial<{
      categoryId: number;
      name: string;
      description: string;
      price: number;
      status: string;
    }>
  ) {
    return this.client.product.update({ where: { id }, data: data as any });
  }

  async updateStatus(id: number, status: string) {
    return this.client.product.update({ where: { id }, data: { status: status as any } });
  }

  async delete(id: number) {
    return this.client.product.delete({ where: { id } });
  }
}
