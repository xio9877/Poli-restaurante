import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private get client() {
    return this.prisma.client;
  }

  async findAll() {
    return this.client.user.findMany();
  }

  async findById(id: string) {
    return this.client.user.findUnique({ where: { id } });
  }

  async findByUsername(username: string) {
    return this.client.user.findUnique({ where: { username } });
  }

  async create(data: { name: string; username: string; role: string; authUserId?: string }) {
    return this.client.user.create({
      data: {
        name: data.name,
        username: data.username,
        role: data.role as any,
        authUserId: data.authUserId,
      },
    });
  }

  async update(id: string, data: Partial<{ name: string; username: string; role: string }>) {
    return this.client.user.update({
      where: { id },
      data: data as any,
    });
  }

  async delete(id: string) {
    return this.client.user.delete({ where: { id } });
  }

  async getByRole(role: string) {
    return this.client.user.findMany({ where: { role: role as any } });
  }
}
