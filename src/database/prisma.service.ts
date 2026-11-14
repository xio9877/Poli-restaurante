import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { prisma } from './db';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  readonly client = prisma;

  async onModuleInit() {
    await this.client.$connect();
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }

  async checkConnection(): Promise<void> {
    await this.client.$queryRaw`SELECT 1`;
  }
}
