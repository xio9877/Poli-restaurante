import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  private get client() {
    return this.prisma.client;
  }

  async findAll() {
    return this.client.customer.findMany();
  }

  async findById(id: string) {
    return this.client.customer.findUnique({ where: { id } });
  }

  async findByPhone(phone: string) {
    return this.client.customer.findUnique({ where: { phone } });
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
    return this.client.customerAddress.create({
      data: { ...data, additionalInfo: data.additionalInfo || '' },
    });
  }

  async updateAddress(
    id: number,
    data: Partial<{ label: string; address: string; additionalInfo: string }>
  ) {
    return this.client.customerAddress.update({ where: { id }, data });
  }

  async deleteAddress(id: number) {
    return this.client.customerAddress.delete({ where: { id } });
  }
}
