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
} from '@nestjs/common';
import { UsersService } from './users.service';
import { SupabaseAuthGuard } from '@/auth/supabase-auth.guard';
import { PaginatedResultDto } from '@/common/dto/pagination.dto';
import { CreateUserDto, UpdateUserDto, UserQueryDto } from './dto/user.dto';

@Controller('users')
@UseGuards(SupabaseAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get()
  async findAll(@Query() query: UserQueryDto): Promise<PaginatedResultDto<any>> {
    const { page = 1, limit = 20, search, role, orderBy = 'createdAt', orderDir = 'desc' } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.usersService['client'].user.findMany({
        where,
        orderBy: { [orderBy]: orderDir },
        skip,
        take: limit,
      }),
      this.usersService['client'].user.count({ where }),
    ]);

    return new PaginatedResultDto(data, total, page, limit);
  }

  @Get('role/:role')
  async getByRole(@Param('role') role: string) {
    return this.usersService.getByRole(role);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.usersService.delete(id);
  }
}
