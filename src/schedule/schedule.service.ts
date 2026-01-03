
import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateScheduleDto } from './dto/createSchedule.dto';
import { UpdateScheduleDto } from './dto/updateSchedule.dto';
import { MqttService } from 'src/mqtt/mqtt.service';

@Injectable()
export class ScheduleService {
  private readonly logger = new Logger(ScheduleService.name);
  
  constructor(private prisma: PrismaService, private mqttService: MqttService) {}

  private async publishGardenSchedules(gardenId: number) {
    try {
      this.logger.log(` [PUBLISH SCHEDULES] Bắt đầu publishGardenSchedules cho Garden ${gardenId}`);
      
      // Lấy thông tin vườn để có espId
      const garden = await this.prisma.garden.findUnique({
        where: { id: gardenId },
      }) as any;

      if (!garden) {
        this.logger.error(` [PUBLISH SCHEDULES] Không tìm thấy Garden ${gardenId}`);
        return;
      }

      this.logger.log(` [PUBLISH SCHEDULES] Garden ${gardenId} - espId: ${garden.espId}`);

      if (!garden.espId || garden.espId === '-1') {
        this.logger.warn(` [PUBLISH SCHEDULES] Vườn ${gardenId} chưa được kết nối với ESP device (espId: ${garden.espId})`);
        return;
      }

    this.logger.log(` [PUBLISH SCHEDULES] Bắt đầu publish schedules cho Garden ${gardenId} - ESP ${garden.espId}`);

    const schedules = await this.prisma.schedule.findMany({
      where: { gardenId, enabled: true },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
    });

    this.logger.log(` [PUBLISH SCHEDULES] Tìm thấy ${schedules.length} schedule(s) được bật`);

    // Gửi từng schedule riêng lẻ với topic : schedules/esp_id/add
    // Nhóm schedules theo repeat type để tính index
    const schedulesByRepeat: { [key: string]: typeof schedules } = {
      once: [],
      daily: [],
      weekly: [],
    };

    for (const schedule of schedules) {
      // Parse repeat: có thể là "weekly:2" hoặc "weekly" hoặc null
      let repeatType: 'once' | 'daily' | 'weekly' = 'daily';
      if (schedule.repeat) {
        if (schedule.repeat.startsWith('weekly')) {
          repeatType = 'weekly';
        } else if (schedule.repeat === 'once') {
          repeatType = 'once';
        } else if (schedule.repeat === 'daily') {
          repeatType = 'daily';
        } else {
          repeatType = schedule.date ? 'once' : 'daily';
        }
      } else {
        repeatType = schedule.date ? 'once' : 'daily';
      }
      
      if (schedulesByRepeat[repeatType]) {
        schedulesByRepeat[repeatType].push(schedule);
      }
    }

    this.logger.log(` [PUBLISH SCHEDULES] Phân loại: once=${schedulesByRepeat.once.length}, daily=${schedulesByRepeat.daily.length}, weekly=${schedulesByRepeat.weekly.length}`);

    // Gửi từng schedule với index tương ứng trong nhóm repeat
    let totalSent = 0;
    for (const repeatType of ['once', 'daily', 'weekly'] as const) {
      const groupSchedules = schedulesByRepeat[repeatType];
      for (let i = 0; i < groupSchedules.length; i++) {
        const schedule = groupSchedules[i];
        const index = i; // Index trong nhóm repeat (bắt đầu từ 0)

        // Parse time (HH:MM) thành hour, minute, second
        const [hour, minute] = schedule.time.split(':').map(Number);
        const second = 0;

        // Xác định dayOfWeek nếu là weekly
        // Parse từ format "weekly:2" hoặc từ date
        
        // let dayOfWeek: number | undefined;
        // if (repeatType === 'weekly') {
        //   if (schedule.repeat && schedule.repeat.startsWith('weekly:')) {
        //     // Parse từ format "weekly:2"
        //     const dayOfWeekStr = schedule.repeat.split(':')[1];
        //     dayOfWeek = parseInt(dayOfWeekStr, 10);
        //     if (isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
        //       // Fallback: dùng date nếu có
        //       if (schedule.date) {
        //         const date = new Date(schedule.date);
        //         dayOfWeek = date.getDay(); // 0 = Chủ nhật, 1 = Thứ 2, ...
        //       }
        //     }
        //   } else if (schedule.date) {
        //     // Parse từ date
        //     const date = new Date(schedule.date);
        //     dayOfWeek = date.getDay(); // 0 = Chủ nhật, 1 = Thứ 2, ...
        //   }
        // }

        let dayOfWeek: number | undefined;

        if (repeatType === 'weekly') {
          if (schedule.repeat?.startsWith('weekly:')) {
            const parsed = Number(schedule.repeat.split(':')[1]);
        
            // Validate 0–6 (0 = Chủ nhật)
            if (!Number.isInteger(parsed) || parsed < 0 || parsed > 6) {
              this.logger.warn(
                `[PUBLISH SCHEDULES] weekly schedule ${schedule.id} có dayOfWeek không hợp lệ: ${schedule.repeat}`
              );
              continue; // bỏ schedule lỗi
            }
        
            dayOfWeek = parsed;
          } else {
            this.logger.warn(
              `[PUBLISH SCHEDULES] weekly schedule ${schedule.id} thiếu dayOfWeek`
            );
            continue;
          }
        }
        


        this.logger.log(` [PUBLISH SCHEDULES] Gửi schedule ${i + 1}/${groupSchedules.length} (${repeatType}): time=${schedule.time}, duration=${schedule.durationSeconds}s${dayOfWeek !== undefined ? `, dayOfWeek=${dayOfWeek}` : ''}`);

        await this.mqttService.sendScheduleAdd(garden.espId, {
          repeat: repeatType,
          ...(repeatType === 'weekly' && dayOfWeek !== undefined && { dayOfWeek }),
          hour,
          minute,
          second,
          time: schedule.durationSeconds,
        });
        totalSent++;
      }
    }

    this.logger.log(` [PUBLISH SCHEDULES] Đã gửi tổng cộng ${totalSent} schedule(s) đến ESP ${garden.espId}`);
    } catch (error) {
      this.logger.error(` [PUBLISH SCHEDULES] Lỗi trong publishGardenSchedules: ${error.message}`);
      this.logger.error(` [PUBLISH SCHEDULES] Stack trace: ${error.stack}`);
      throw error; // Re-throw để caller biết có lỗi
    }
  }

  // Tạo schedule mới cho vườn
  async createSchedule(createScheduleDto: CreateScheduleDto, userId: number) {
    const { date, time, durationSeconds, repeat, gardenId } = createScheduleDto;

    this.logger.log(` [CREATE SCHEDULE] Bắt đầu tạo schedule cho Garden ${gardenId}`);

    // Kiểm tra vườn có tồn tại không
    const garden = await this.prisma.garden.findUnique({
      where: { id: gardenId },
    });
    if (!garden) {
      throw new NotFoundException('Vườn không tồn tại');
    }

    this.logger.log(` [CREATE SCHEDULE] Garden ${gardenId} - espId: ${(garden as any).espId}`);

    // Kiểm tra user có quyền với vườn này không
    if (garden.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền tạo lịch tưới cho vườn này');
    }

    // Validate logic: nếu repeat không có -> phải có date (lịch 1 lần)
    if ((!repeat || repeat === 'once') && !date) {
      throw new BadRequestException('Lịch 1 lần cần có date');
    }

    // Tạo schedule
    const created = await this.prisma.schedule.create({
      data: {
        date: date ? new Date(date) : null,
        time,
        durationSeconds,
        repeat: repeat ?? (date ? 'once' : null),
        gardenId,
      }
    });

    this.logger.log(` [CREATE SCHEDULE] Đã tạo schedule thành công - ID: ${created.id}`);
    this.logger.log(` [CREATE SCHEDULE] Bắt đầu publish schedules đến ESP...`);

    // Publish toàn bộ schedules của vườn sang ESP
    try {
      await this.publishGardenSchedules(gardenId);
      this.logger.log(` [CREATE SCHEDULE] Đã hoàn thành publish schedules`);
    } catch (error) {
      this.logger.error(` [CREATE SCHEDULE] Lỗi khi publish schedules: ${error.message}`);
      this.logger.error(` [CREATE SCHEDULE] Stack trace: ${error.stack}`);
      // Không throw error để không ảnh hưởng đến việc tạo schedule
    }

    return created;
  }

  // Lấy tất cả schedule của một vườn
  async getSchedulesByGarden(gardenId: number, userId: number) {
    // Kiểm tra vườn có tồn tại không
    const garden = await this.prisma.garden.findUnique({
      where: { id: gardenId },
    });
    if (!garden) {
      throw new NotFoundException('Vườn không tồn tại');
    }

    // Kiểm tra user có quyền xem vườn này không
    if (garden.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền xem lịch tưới của vườn này');
    }

    return this.prisma.schedule.findMany({
      where: { gardenId },
      orderBy: { time: 'asc' }
    });
  }

  // Lấy tất cả schedule của user (tất cả vườn)
  async getUserSchedules(userId: number) {
    // Lấy tất cả vườn của user
    const gardens = await this.prisma.garden.findMany({
      where: { userId },
      select: { id: true },
    });

    const gardenIds = gardens.map((g) => g.id);

    return this.prisma.schedule.findMany({
      where: {
        gardenId: { in: gardenIds },
      },
      orderBy: [
        { gardenId: 'asc' },
        { time: 'asc' },
      ]
    });
  }

  // Lấy schedule theo ID
  async getScheduleById(id: number, userId: number) {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id },
      include: {
        garden: {
          include: {
            plant: true,
          },
        },
      },
    });

    if (!schedule) {
      throw new NotFoundException('Lịch tưới không tồn tại');
    }

    // Kiểm tra user có quyền xem schedule này không
    if (schedule.garden.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền xem lịch tưới này');
    }

    return schedule;
  }

  // Cập nhật schedule
  async updateSchedule(id: number, updateScheduleDto: UpdateScheduleDto, userId: number) {
    // Kiểm tra schedule có tồn tại không
    const schedule = await this.prisma.schedule.findUnique({
      where: { id },
      include: {
        garden: true,
      },
    });

    if (!schedule) {
      throw new NotFoundException('Lịch tưới không tồn tại');
    }

    // Kiểm tra user có quyền cập nhật schedule này không
    if (schedule.garden.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền cập nhật lịch tưới này');
    }

    // Chuẩn hóa dữ liệu update
    const data: any = { ...updateScheduleDto };
    if (data.date) data.date = new Date(data.date);

    // Cập nhật schedule
    const updated = await this.prisma.schedule.update({
      where: { id },
      data
    });

    // Publish toàn bộ schedules của vườn sang ESP
    await this.publishGardenSchedules(schedule.gardenId);

    return updated;
  }

  // Xóa schedule
  async deleteSchedule(id: number, userId: number) {
    // Kiểm tra schedule có tồn tại không
    const schedule = await this.prisma.schedule.findUnique({
      where: { id },
      include: {
        garden: true,
      },
    });

    if (!schedule) {
      throw new NotFoundException('Lịch tưới không tồn tại');
    }

    // Kiểm tra user có quyền xóa schedule này không
    if (schedule.garden.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền xóa lịch tưới này');
    }

    const deleted = await this.prisma.schedule.delete({
      where: { id },
    });

    // Publish toàn bộ schedules của vườn sang ESP
    await this.publishGardenSchedules(schedule.gardenId);

    return deleted;
  }
}
