import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { BaseQueryDto } from '@/common/dto/query.dto';
import { PaginatedResultDto } from '@/common/dto/pagination.dto';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  private get client() {
    return this.prisma.client;
  }

  async findAll() {
    return this.client.customer.findMany();
  }

  async findPage(query: BaseQueryDto): Promise<PaginatedResultDto<any>> {
    const { page = 1, limit = 20, search, orderBy = 'createdAt', orderDir = 'desc' } = query;
    const allowedOrderBy = ['name', 'username', 'phone', 'createdAt'];
    const sortField = allowedOrderBy.includes(orderBy) ? orderBy : 'createdAt';
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { username: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};
    const [data, total] = await Promise.all([
      this.client.customer.findMany({
        where,
        orderBy: { [sortField]: orderDir },
        skip: (page - 1) * limit,
        take: limit,
        include: { addresses: true },
      }),
      this.client.customer.count({ where }),
    ]);

    return new PaginatedResultDto(data, total, page, limit);
  }

  async findById(id: string) {
    return this.client.customer.findUnique({ where: { id } });
  }

  async findByPhone(phone: string) {
    return this.client.customer.findFirst({ where: { phone } });
  }

  async create(data: { name: string; username: string; phone: string }) {
    return this.client.customer.create({ data });
  }

  async createWithAddress(data: {
    name: string;
    username: string;
    phone: string;
    addressLabel: string;
    address: string;
    additionalInfo?: string;
  }) {
    const { addressLabel, address, additionalInfo, ...customerData } = data;
    return this.client.$transaction(async (tx) => {
      const customer = await tx.customer.create({ data: customerData });
      await tx.customerAddress.create({
        data: {
          customerId: customer.id,
          label: addressLabel,
          address,
          additionalInfo: additionalInfo || '',
        },
      });
      return tx.customer.findUnique({
        where: { id: customer.id },
        include: { addresses: true },
      });
    });
  }

  async update(id: string, data: Partial<{ name: string; username: string; phone: string }>) {
    return this.client.customer.update({ where: { id }, data });
  }

  async delete(id: string) {
    const activeDelivery = await this.client.deliveryOrder.findFirst({ where: { customerId: id } });
    if (activeDelivery) {
      throw new ConflictException('Customer has delivery orders and cannot be deleted');
    }
    return this.client.customer.delete({ where: { id } });
  }

  async getAddresses(customerId: string) {
    return this.client.customerAddress.findMany({ where: { customerId } });
  }

  async createAddress(data: {
    customerId: string;
    label: string;
    address: string;
    additionalInfo?: string;
  }) {
    const customer = await this.client.customer.findUnique({ where: { id: data.customerId } });
    if (!customer) throw new NotFoundException('Customer not found');
    return this.client.customerAddress.create({
      data: { ...data, additionalInfo: data.additionalInfo || '' },
    });
  }

  async updateAddress(
    id: number,
    data: Partial<{ label: string; address: string; additionalInfo: string }>
  ) {
    const address = await this.client.customerAddress.findUnique({ where: { id } });
    if (!address) throw new NotFoundException('Address not found');
    const hasDelivery = await this.client.deliveryOrder.findFirst({ where: { addressId: id } });
    if (hasDelivery) {
      throw new ConflictException('Address is linked to a delivery order and cannot be changed');
    }
    return this.client.customerAddress.update({ where: { id }, data });
  }

  async deleteAddress(id: number) {
    const address = await this.client.customerAddress.findUnique({ where: { id } });
    if (!address) throw new NotFoundException('Address not found');
    const hasDelivery = await this.client.deliveryOrder.findFirst({ where: { addressId: id } });
    if (hasDelivery) {
      throw new ConflictException('Address is linked to a delivery order and cannot be deleted');
    }
    return this.client.customerAddress.delete({ where: { id } });
  }
}
