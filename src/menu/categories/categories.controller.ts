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
import { CategoriesService } from './categories.service';
import { SupabaseAuthGuard } from '@/auth/supabase-auth.guard';
import { PaginatedResultDto } from '@/common/dto/pagination.dto';
import { CreateCategoryDto, UpdateCategoryDto, CategoryQueryDto } from './dto/category.dto';

@Controller('categories')
@UseGuards(SupabaseAuthGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  async create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Get()
  async findAll(@Query() query: CategoryQueryDto): Promise<PaginatedResultDto<any>> {
    return this.categoriesService.findAll(query);
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.findById(id);
  }

  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.delete(id);
  }
}
