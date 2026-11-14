import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CategoryQueryDto } from './dto/category.dto';
import { PaginatedResultDto } from '../../common/dto/pagination.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  private get client() {
    return this.prisma.client;
  }

  async findAll(query: CategoryQueryDto): Promise<PaginatedResultDto<any>> {
    const { page = 1, limit = 20, search, orderBy, orderDir = 'desc' } = query;
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { description: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};
    const sortField = orderBy === 'name' ? 'name' : 'createdAt';
    const [data, total] = await Promise.all([
      this.client.category.findMany({
        where,
        orderBy: { [sortField]: orderDir },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.client.category.count({ where }),
    ]);

    return new PaginatedResultDto(data, total, page, limit);
  }

  async findById(id: number) {
    const category = await this.client.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async create(data: { name: string; description?: string }) {
    return this.client.category.create({ data });
  }

  async update(id: number, data: Partial<{ name: string; description: string }>) {
    const category = await this.client.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    return this.client.category.update({ where: { id }, data });
  }

  async delete(id: number) {
    const category = await this.client.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    const productCount = await this.client.product.count({ where: { categoryId: id } });
    if (productCount > 0) {
      throw new ConflictException("Move or remove this category's products before deleting it");
    }
    return this.client.category.delete({ where: { id } });
  }
}
