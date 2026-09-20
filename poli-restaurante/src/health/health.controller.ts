import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { PrismaService } from '../database/prisma.service';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prisma: PrismaService
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([() => this.prisma.$queryRaw`SELECT 1` as any]);
  }

  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([() => this.prisma.$queryRaw`SELECT 1` as any]);
  }

  @Get('live')
  @HealthCheck()
  live() {
    return this.health.check([]);
  }
}
