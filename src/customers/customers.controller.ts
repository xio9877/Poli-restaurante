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
import { CustomersService } from './customers.service';
import { SupabaseAuthGuard } from '@/auth/supabase-auth.guard';
import { BaseQueryDto } from '@/common/dto/query.dto';
import {
  CreateCustomerAddressDto,
  CreateCustomerDto,
  CreateCustomerWithAddressDto,
  UpdateCustomerAddressDto,
  UpdateCustomerDto,
} from './dto/customer.dto';

@Controller('customers')
@UseGuards(SupabaseAuthGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  async create(@Body() dto: CreateCustomerDto) {
    return this.customersService.create(dto);
  }

  @Post('with-address')
  async createWithAddress(@Body() dto: CreateCustomerWithAddressDto) {
    return this.customersService.createWithAddress(dto);
  }

  @Get()
  async findAll(@Query() query: BaseQueryDto) {
    return this.customersService.findPage(query);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.customersService.findById(id);
  }

  @Get('phone/:phone')
  async findByPhone(@Param('phone') phone: string) {
    return this.customersService.findByPhone(phone);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customersService.update(id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.customersService.delete(id);
  }

  @Get(':id/addresses')
  async getAddresses(@Param('id') id: string) {
    return this.customersService.getAddresses(id);
  }

  @Post(':id/addresses')
  async createAddress(@Param('id') id: string, @Body() dto: CreateCustomerAddressDto) {
    return this.customersService.createAddress({ customerId: id, ...dto });
  }

  @Patch('addresses/:addressId')
  async updateAddress(
    @Param('addressId', ParseIntPipe) addressId: number,
    @Body() dto: UpdateCustomerAddressDto
  ) {
    return this.customersService.updateAddress(addressId, dto);
  }

  @Delete('addresses/:addressId')
  async deleteAddress(@Param('addressId', ParseIntPipe) addressId: number) {
    return this.customersService.deleteAddress(addressId);
  }
}
