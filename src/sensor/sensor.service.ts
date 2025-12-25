import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

export interface SensorDataDto {
  temperature: number;
  airHumidity: number;
  soilMoisture: number;
  gardenId: number;
}

@Injectable()
export class SensorService {
  constructor(private prisma: PrismaService) {}

  // Cập nhật dữ liệu sensor từ ESP8266 vào ESPDevice
  async createSensorReading(data: SensorDataDto) {
    // Kiểm tra vườn có tồn tại không
    const garden = await this.prisma.garden.findUnique({
      where: { id: data.gardenId },
      include: { espDevice: true },
    });

    if (!garden) {
      throw new NotFoundException(`Vườn với ID ${data.gardenId} không tồn tại`);
    }

    // Kiểm tra vườn đã được kết nối với ESP device chưa (espId !== "-1")
    if (!garden.espId || garden.espId === "-1" || !garden.espDevice) {
      throw new BadRequestException(`Vườn ${data.gardenId} chưa được kết nối với ESP device`);
    }

    // Validate dữ liệu
    if (data.temperature < -50 || data.temperature > 60) {
      throw new BadRequestException('Giá trị nhiệt độ không hợp lệ');
    }
    if (data.airHumidity < 0 || data.airHumidity > 100) {
      throw new BadRequestException('Giá trị độ ẩm không khí không hợp lệ (0-100%)');
    }
    if (data.soilMoisture < 0 || data.soilMoisture > 100) {
      throw new BadRequestException('Giá trị độ ẩm đất không hợp lệ (0-100%)');
    }

    // Cập nhật dữ liệu vào ESPDevice (tự động set isConnected = true vì ESP đang gửi dữ liệu)
    return this.prisma.espDevice.update({
      where: { espId: garden.espId },
      data: {
        temperature: data.temperature,
        airHumidity: data.airHumidity,
        soilMoisture: data.soilMoisture,
        lastUpdated: new Date(),
        isConnected: true, // ESP đang online vì đang gửi dữ liệu
      },
      include: {
        gardens: {
          include: {
            plant: true,
          },
        },
      },
    });
  }

  // Lấy dữ liệu sensor hiện tại của một vườn (từ ESPDevice)
  async getLatestSensorReading(gardenId: number) {
    const garden = await this.prisma.garden.findUnique({
      where: { id: gardenId },
      include: {
        espDevice: true,
        plant: true,
      },
    });

    if (!garden) {
      throw new NotFoundException(`Vườn với ID ${gardenId} không tồn tại`);
    }

    // Kiểm tra vườn đã được kết nối với ESP device chưa (espId !== "-1")
    if (!garden.espDevice || garden.espId === "-1") {
      throw new NotFoundException(`Vườn ${gardenId} chưa được kết nối với ESP device`);
    }

    return garden.espDevice;
  }

  // Lấy tất cả dữ liệu sensor của user (tất cả vườn)
  async getUserSensorData(userId: number) {
    // Lấy tất cả vườn của user cùng với ESPDevice
    const gardens = await this.prisma.garden.findMany({
      where: { userId },
      include: {
        espDevice: true,
        plant: true,
      },
    });

    // Lọc các vườn đã kết nối ESPDevice (espId !== "-1") và trả về
    return gardens
      .filter((garden) => garden.espDevice !== null && garden.espId !== "-1")
      .map((garden) => ({
        ...garden.espDevice,
        garden: {
          id: garden.id,
          name: garden.name,
          plant: garden.plant,
        },
      }));
  }
}

