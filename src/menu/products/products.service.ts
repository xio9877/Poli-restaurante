import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ProductQueryDto } from '@/common/dto/query.dto';
import { PaginatedResultDto } from '@/common/dto/pagination.dto';

type ProductStatus = 'available' | 'unavailable';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  private get client() {
    return this.prisma.client;
  }

  async findAll(query: ProductQueryDto): Promise<PaginatedResultDto<any>> {
    const { page = 1, limit = 20, search, status, categoryId, orderBy, orderDir = 'desc' } = query;
    const where: {
      status?: string;
      categoryId?: number;
      OR?: {
        name?: { contains: string; mode: 'insensitive' };
        description?: { contains: string; mode: 'insensitive' };
      }[];
    } = {};
    if (status) where.status = status;
    if (categoryId) where.categoryId = categoryId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const sortField = ['name', 'price', 'status'].includes(orderBy || '') ? orderBy! : 'createdAt';
    const [data, total] = await Promise.all([
      this.client.product.findMany({
        where,
        orderBy: { [sortField]: orderDir },
        skip: (page - 1) * limit,
        take: limit,
        include: { category: true },
      }),
      this.client.product.count({ where }),
    ]);

    return new PaginatedResultDto(data, total, page, limit);
  }

  async findAvailable() {
    return this.client.product.findMany({ where: { status: 'available' } });
  }

  async findById(id: number) {
    const product = await this.client.product.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async findByCategory(categoryId: number) {
    return this.client.product.findMany({ where: { categoryId, status: 'available' } });
  }

  async create(data: {
    categoryId: number;
    name: string;
    description?: string;
    price: number;
    status?: ProductStatus;
  }) {
    const category = await this.client.category.findUnique({ where: { id: data.categoryId } });
    if (!category) throw new NotFoundException('Category not found');
    return this.client.product.create({
      data: {
        categoryId: data.categoryId,
        name: data.name,
        description: data.description,
        price: data.price,
        status: data.status || 'available',
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
      status: ProductStatus;
    }>
  ) {
    const product = await this.client.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    if (data.categoryId !== undefined) {
      const category = await this.client.category.findUnique({ where: { id: data.categoryId } });
      if (!category) throw new NotFoundException('Category not found');
    }
    return this.client.product.update({ where: { id }, data });
  }

  async updateStatus(id: number, status: ProductStatus) {
    const product = await this.client.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    return this.client.product.update({ where: { id }, data: { status } });
  }

  async delete(id: number) {
    const product = await this.client.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    const orderDetailCount = await this.client.orderDetail.count({ where: { productId: id } });
    if (orderDetailCount > 0) {
      throw new ConflictException(
        'Products in order history cannot be deleted; mark them unavailable'
      );
    }
    return this.client.product.delete({ where: { id } });
  }
}
