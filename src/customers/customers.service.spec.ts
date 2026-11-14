jest.mock('../database/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service';
import { CustomersService } from './customers.service';

describe('CustomersService', () => {
  let service: CustomersService;

  it('finds a customer by a non-unique phone number', async () => {
    const customer = { id: 'customer-1', phone: '5551234' };
    const client = {
      customer: { findFirst: jest.fn().mockResolvedValue(customer) },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [CustomersService, { provide: PrismaService, useValue: { client } }],
    }).compile();
    service = module.get(CustomersService);

    await expect(service.findByPhone('5551234')).resolves.toBe(customer);
    expect(client.customer.findFirst).toHaveBeenCalledWith({ where: { phone: '5551234' } });
  });

  it('falls back to a safe sort field for customer pagination', async () => {
    const client = {
      customer: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [CustomersService, { provide: PrismaService, useValue: { client } }],
    }).compile();
    service = module.get(CustomersService);

    await service.findPage({ page: 2, limit: 10, orderBy: 'addresses', orderDir: 'asc' });

    expect(client.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'asc' }, skip: 10, take: 10 })
    );
  });
});
