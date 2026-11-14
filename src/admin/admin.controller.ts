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
import { AdminService } from './admin.service';
import { SupabaseAuthGuard } from '@/auth/supabase-auth.guard';
import { CurrentUserId } from '@/common/decorators/current-user.decorator';
import { PaginatedResultDto } from '@/common/dto/pagination.dto';
import { CreateProductDto, UpdateProductDto } from '@/menu/products/dto/product.dto';
import { ProductQueryDto } from '@/common/dto/query.dto';
import {
  CreateTableDto,
  UpdateTableDto,
  UpdateTableStateDto,
  TableQueryDto,
} from '@/tables/dto/table.dto';
import { CreateUserDto, UpdateUserDto, UserQueryDto } from '@/users/dto/user.dto';

@Controller('admin')
@UseGuards(SupabaseAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('products')
  async createProduct(@Body() dto: CreateProductDto) {
    return this.adminService.createProduct(dto);
  }

  @Get('products')
  async getProducts(@Query() query: ProductQueryDto): Promise<PaginatedResultDto<any>> {
    return this.adminService.getProducts(query);
  }

  @Get('products/:id')
  async getProduct(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getProduct(id);
  }

  @Patch('products/:id')
  async updateProduct(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductDto) {
    return this.adminService.updateProduct(id, dto);
  }

  @Patch('products/:id/status')
  async updateProductStatus(@Param('id', ParseIntPipe) id: number, @Body('status') status: string) {
    return this.adminService.updateProductStatus(id, status);
  }

  @Delete('products/:id')
  async deleteProduct(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteProduct(id);
  }

  @Post('tables')
  async createTable(@Body() dto: CreateTableDto) {
    return this.adminService.createTable(dto);
  }

  @Get('tables')
  async getTables(@Query() query: TableQueryDto): Promise<PaginatedResultDto<any>> {
    return this.adminService.getTables(query);
  }

  @Get('tables/:id')
  async getTable(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getTable(id);
  }

  @Patch('tables/:id')
  async updateTable(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTableDto) {
    return this.adminService.updateTable(id, dto);
  }

  @Patch('tables/:id/state')
  async updateTableState(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTableStateDto) {
    return this.adminService.updateTableState(id, dto.state);
  }

  @Delete('tables/:id')
  async deleteTable(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteTable(id);
  }

  @Post('users')
  async createUser(@Body() dto: CreateUserDto) {
    return this.adminService.createUser(dto);
  }

  @Get('users')
  async getUsers(@Query() query: UserQueryDto): Promise<PaginatedResultDto<any>> {
    return this.adminService.getUsers(query);
  }

  @Get('users/:id')
  async getUser(@Param('id') id: string) {
    return this.adminService.getUser(id);
  }

  @Patch('users/:id')
  async updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.adminService.updateUser(id, dto);
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Get('reports/sales')
  async getSalesReport(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.adminService.getSalesReport(startDate, endDate);
  }

  @Get('reports/prep-times')
  async getPrepTimeReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.adminService.getPrepTimeReport(startDate, endDate);
  }
}
