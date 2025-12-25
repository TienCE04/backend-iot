import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class LogService {
  private readonly logger = new Logger(LogService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Tạo log lịch sử tưới từ ESP
   * @param data Dữ liệu log từ ESP
   */
  async createIrrigationLog(data: {
    gardenId: number;
    irrigationTime?: Date;
    duration: number;
    status?: string;
    type?: string;
    notes?: string;
  }) {
    try {
      // Kiểm tra vườn có tồn tại không
      const garden = await this.prisma.garden.findUnique({
        where: { id: data.gardenId },
      });

      if (!garden) {
        throw new NotFoundException(
          `Vườn với ID ${data.gardenId} không tồn tại`,
        );
      }

      // Tạo log
      const log = await this.prisma.irrigationLog.create({
        data: {
          gardenId: data.gardenId,
          irrigationTime: data.irrigationTime || new Date(),
          duration: data.duration,
          status: data.status || 'completed',
          type: data.type || 'manual',
          notes: data.notes,
        },
        include: {
          garden: {
            include: {
              plant: true,
            },
          },
        },
      });

      this.logger.log(
        ` Đã tạo log tưới cho vườn ${data.gardenId}: ${data.duration} giây`,
      );
      return log;
    } catch (error) {
      this.logger.error(` Lỗi tạo log tưới: ${error.message}`);
      throw error;
    }
  }

  /**
   * Lấy tất cả logs của một vườn
   * @param gardenId ID của vườn
   * @param limit Số lượng log tối đa
   */
  async getLogsByGarden(gardenId: number, limit: number = 10) {
    const garden = await this.prisma.garden.findUnique({
      where: { id: gardenId },
    });

    if (!garden) {
      throw new NotFoundException(`Vườn với ID ${gardenId} không tồn tại`);
    }

    return this.prisma.irrigationLog.findMany({
      where: { gardenId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Lấy tất cả logs của user (tất cả vườn)
   * @param userId ID của user
   * @param limit Số lượng log tối đa
   */
  async getUserLogs(userId: number, limit: number = 100) {
    // Lấy tất cả vườn của user
    const gardens = await this.prisma.garden.findMany({
      where: { userId },
      select: { id: true },
    });

    const gardenIds = gardens.map((g) => g.id);

    return this.prisma.irrigationLog.findMany({
      where: {
        gardenId: { in: gardenIds },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Lấy log theo ID
   * @param id ID của log
   */
  async getLogById(id: number) {
    const log = await this.prisma.irrigationLog.findUnique({
      where: { id }
    });

    if (!log) {
      throw new NotFoundException(`Log với ID ${id} không tồn tại`);
    }

    return log;
  }

  /**
   * Xóa log
   * @param id ID của log
   */
  async deleteLog(id: number) {
    const log = await this.prisma.irrigationLog.findUnique({
      where: { id },
    });

    if (!log) {
      throw new NotFoundException(`Log với ID ${id} không tồn tại`);
    }

    return this.prisma.irrigationLog.delete({
      where: { id },
    });
  }
}
