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
import { TablesService } from './tables.service';
import { SupabaseAuthGuard } from '@/auth/supabase-auth.guard';
import { PaginatedResultDto } from '@/common/dto/pagination.dto';
import {
  CreateTableDto,
  UpdateTableDto,
  UpdateTableStateDto,
  TableQueryDto,
} from './dto/table.dto';

@Controller('tables')
@UseGuards(SupabaseAuthGuard)
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Post()
  async create(@Body() dto: CreateTableDto) {
    return this.tablesService.create(dto);
  }

  @Get()
  async findAll(@Query() query: TableQueryDto): Promise<PaginatedResultDto<any>> {
    const { page = 1, limit = 20, search, state, orderBy = 'createdAt', orderDir = 'desc' } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (state) where.state = state;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.tablesService['client'].restaurantTable.findMany({
        where,
        orderBy: { [orderBy]: orderDir },
        skip,
        take: limit,
      }),
      this.tablesService['client'].restaurantTable.count({ where }),
    ]);

    return new PaginatedResultDto(data, total, page, limit);
  }

  @Get('available')
  async findAvailable() {
    return this.tablesService.findAvailable();
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.tablesService.findById(id);
  }

  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTableDto) {
    return this.tablesService.update(id, dto);
  }

  @Patch(':id/state')
  async updateState(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTableStateDto) {
    return this.tablesService.updateState(id, dto.state);
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.tablesService.delete(id);
  }
}
