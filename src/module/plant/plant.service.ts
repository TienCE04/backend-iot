import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePlantDto } from './dto/createPlant.dto';
import { UpdatePlantDto } from './dto/updatePlant.dto';

@Injectable()
export class PlantService {
  constructor(private prisma: PrismaService) {}

  async create(createPlantDto: CreatePlantDto, createdById: number) {
    return this.prisma.plant.create({
      data: {
        ...createPlantDto,
        createdById: createdById, // Lấy từ user đang đăng nhập (Admin)
      },
    });
  }

  async findAll() {
    return this.prisma.plant.findMany();
  }

  async findOne(id: number) {
    const plant = await this.prisma.plant.findUnique({
      where: { id },
    });
    if (!plant) {
      throw new NotFoundException(`Plant with ID ${id} not found`);
    }
    return plant;
  }

  async update(id: number, updatePlantDto: UpdatePlantDto) {
    try {
      return await this.prisma.plant.update({
        where: { id },
        data: updatePlantDto,
      });
    } catch (error) {
      // Xử lý lỗi nếu ID không tồn tại
      if (error.code === 'P2025') {
        throw new NotFoundException(`Plant with ID ${id} not found`);
      }
      throw error;
    }
  }

async deleteUserById(id: number): Promise<boolean> { 
    try {
        const result = await this.prisma.user.delete({ where: { id } });
        return !!result; 
    } catch (error) {
        if (error.code === 'P2025') {
            return false; 
        }
        throw error;
    }
}
}