import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class RoleService implements OnModuleInit {
  constructor(private readonly prismaService: PrismaService) {}
  async onModuleInit() {
    const roles = await this.prismaService.role.findMany();
    if (roles.length == 0) {
      await this.prismaService.role.createMany({
        data: [{ name: 'USER' }, { name: 'ADMIN' }],
      });
    }
  }

  async getRoleByName(nameRole: string) {
    const role = await this.prismaService.role.findUnique({
      where: {
        name: nameRole,
      },
    });
    return role;
  }
}