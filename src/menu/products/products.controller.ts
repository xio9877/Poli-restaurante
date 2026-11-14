import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { SupabaseAuthGuard } from '@/auth/supabase-auth.guard';
import { PaginatedResultDto } from '@/common/dto/pagination.dto';
import { CreateProductDto, UpdateProductDto, UpdateProductStatusDto } from './dto/product.dto';
import { ProductQueryDto } from '@/common/dto/query.dto';

@Controller('products')
@UseGuards(SupabaseAuthGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  async create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Get()
  async findAll(@Query() query: ProductQueryDto): Promise<PaginatedResultDto<any>> {
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
      this.productsService['client'].product.findMany({
        where,
        orderBy: { [orderBy]: orderDir },
        skip,
        take: limit,
      }),
      this.productsService['client'].product.count({ where }),
    ]);

    return new PaginatedResultDto(data, total, page, limit);
  }

  @Get('available')
  async findAvailable() {
    return this.productsService.findAvailable();
  }

  @Get('category/:categoryId')
  async findByCategory(@Param('categoryId', ParseIntPipe) categoryId: number) {
    return this.productsService.findByCategory(categoryId);
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findById(id);
  }

  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Patch(':id/status')
  async updateStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductStatusDto) {
    return this.productsService.updateStatus(id, dto.status);
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.delete(id);
  }
}
