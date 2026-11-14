import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  private get client() {
    return this.prisma.client;
  }

  async findAll() {
    return this.client.category.findMany();
  }

  async findById(id: number) {
    return this.client.category.findUnique({ where: { id } });
  }

  async create(data: { name: string; description?: string }) {
    return this.client.category.create({ data });
  }

  async update(id: number, data: Partial<{ name: string; description: string }>) {
    return this.client.category.update({ where: { id }, data });
  }

  async delete(id: number) {
    return this.client.category.delete({ where: { id } });
  }
}
