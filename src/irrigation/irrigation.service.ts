import { Injectable, Logger, NotFoundException, BadRequestException, Inject, forwardRef, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { MqttService } from 'src/mqtt/mqtt.service';
import { IrrigationMode } from './irrigation-mode.enum';
import { LogService } from 'src/log/log.service';

export interface SensorReading {
  temperature: number;
  airHumidity: number;
  soilMoisture: number;
}


export interface ThresholdAlert {
  type: 'temperature' | 'airHumidity' | 'soilMoisture';
  message: string;
  currentValue: number;
  threshold: { min?: number; max?: number };
}

@Injectable()
export class IrrigationService {
  private readonly logger = new Logger(IrrigationService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => MqttService))
    private mqttService: MqttService,
    private logService: LogService
  ) {}

//auto
  async checkThresholdAndIrrigate(gardenId: number, sensorData: SensorReading): Promise<ThresholdAlert[]> {
    const garden = await this.prisma.garden.findUnique({
      where: { id: gardenId },
      include: { plant: true },
    }) as any;

    if (!garden) {
      throw new NotFoundException(`Vườn với ID ${gardenId} không tồn tại`);
    }

    if (garden.irrigationMode !== 'auto') {
      return [];
    }

    const plant = garden.plant;
  
    // let shouldIrrigate = false;

    if (garden.irrigationMode === 'auto') {
      try {
        await this.mqttService.sendIrrigationStatus(garden.espId, 2);
        await this.mqttService.sendBioCycle(
          garden.espId,
          plant.maxTemperature,
          plant.maxAirHumidity,
          plant.minSoilMoisture
        );
      } catch (error) {
        this.logger.error(`Lỗi gửi BioCycle cho garden ${gardenId}: ${error.message}`);
      }
    }

    const alerts: ThresholdAlert[] = [];
    // kiểm tra -> cảnh báo
    if (plant.minTemperature !== null || plant.maxTemperature !== null) {
      if (plant.minTemperature !== null && sensorData.temperature < plant.minTemperature) {
        alerts.push({
          type: 'temperature',
          message: `  Nhiệt độ quá thấp: ${sensorData.temperature.toFixed(1)}°C (ngưỡng: ${plant.minTemperature}°C)`,
          currentValue: sensorData.temperature,
          threshold: { min: plant.minTemperature ?? undefined, max: plant.maxTemperature ?? undefined },
        });
      }
      if (plant.maxTemperature !== null && sensorData.temperature > plant.maxTemperature) {
        alerts.push({
          type: 'temperature',
          message: `  Nhiệt độ quá cao: ${sensorData.temperature.toFixed(1)}°C (ngưỡng: ${plant.maxTemperature}°C)`,
          currentValue: sensorData.temperature,
          threshold: { min: plant.minTemperature ?? undefined, max: plant.maxTemperature ?? undefined },
        });
      }
    }

    if (plant.minAirHumidity !== null || plant.maxAirHumidity !== null ) {
      if (plant.minAirHumidity !== null && sensorData.airHumidity < plant.minAirHumidity) {
        alerts.push({
          type: 'airHumidity',
          message: `  Độ ẩm không khí quá thấp: ${sensorData.airHumidity.toFixed(1)}% (ngưỡng: ${plant.minAirHumidity}%)`,
          currentValue: sensorData.airHumidity,
          threshold: { min: plant.minAirHumidity ?? undefined, max: plant.maxAirHumidity ?? undefined },
        });
      }
      if (plant.maxAirHumidity !== null && sensorData.airHumidity > plant.maxAirHumidity) {
        alerts.push({
          type: 'airHumidity',
          message: `  Độ ẩm không khí quá cao: ${sensorData.airHumidity.toFixed(1)}% (ngưỡng: ${plant.maxAirHumidity}%)`,
          currentValue: sensorData.airHumidity,
          threshold: { min: plant.minAirHumidity ?? undefined, max: plant.maxAirHumidity ?? undefined },
        });
      }
    }
    if (plant.minSoilMoisture !== null ) {
    if (plant.minSoilMoisture !== null && sensorData.soilMoisture <  plant.minSoilMoisture) {
      alerts.push({
        type: 'soilMoisture',
        message: `  Độ ẩm đất quá thấp: ${sensorData.soilMoisture.toFixed(1)}% (ngưỡng: ${plant.minSoilMoisture}%. Bắt đầu tiến hành quá trình tưới nước trong 2p)`,
        currentValue: sensorData.soilMoisture,
        threshold: { min: plant.minSoilMoisture ?? undefined, max: plant.maxSoilMoisture ?? undefined },
      });
    }
    }
    // // kiểm tra -> tưới
    // if (plant.minSoilMoisture !== null && sensorData.soilMoisture < plant.minSoilMoisture) {
    //   alerts.push({
    //     type: 'soilMoisture',
    //     message: `  Độ ẩm đất quá thấp: ${sensorData.soilMoisture.toFixed(1)}% (ngưỡng: ${plant.minSoilMoisture}%) - Tự động tưới`,
    //     currentValue: sensorData.soilMoisture,
    //     threshold: { min: plant.minSoilMoisture ?? undefined, max: plant.maxSoilMoisture ?? undefined },
    //   });
    //   shouldIrrigate = true;
    // }

    // if (plant.maxSoilMoisture !== null && sensorData.soilMoisture > plant.maxSoilMoisture) {
    //   alerts.push({
    //     type: 'soilMoisture',
    //     message: `  Độ ẩm đất quá cao: ${sensorData.soilMoisture.toFixed(1)}% (ngưỡng: ${plant.maxSoilMoisture}%)`,
    //     currentValue: sensorData.soilMoisture,
    //     threshold: { min: plant.minSoilMoisture ?? undefined, max: plant.maxSoilMoisture ?? undefined },
    //   });
    // }

    // if (alerts.length > 0) {
    //   this.logger.warn(` Cảnh báo cho vườn #${gardenId}:`);
    //   alerts.forEach((alert) => {
    //     this.logger.warn(`   ${alert.message}`);
    //   });
    // }

    // // Tự động tưới nếu độ ẩm đất thấp - Gửi lệnh qua MQTT
    // if (shouldIrrigate) {
    //   if (garden.espId && garden.espId !== '-1') {
    //     await this.updateGardenPumpStatus(garden.id, {
    //       pumpStatus: 'pending',
    //       message: 'Đang gửi lệnh tưới tự động',
    //     });
    //     // Gửi status = 2 (Auto)
    //     await this.mqttService.sendIrrigationStatus(garden.espId as any, 2);
    //     await this.mqttService.sendPumpCommand(garden.espId as any, 60);
    //     this.logger.log(` Đã gửi lệnh tưới tự động (Auto) cho vườn #${gardenId} - ESP ${garden.espId}`);
    //   } else {
    //     this.logger.warn(` Vườn ${gardenId} chưa được kết nối với ESP device - Không thể tưới tự động`);
    //     await this.updateGardenPumpStatus(garden.id, {
    //       pumpStatus: 'error',
    //       message: 'Vườn chưa được kết nối với ESP device - Không thể tưới tự động',
    //       success: false,
    //     });
    //   }
    // }
    return alerts;

  }

  //manual
  //bật máy bơm
  async startIrrigation(gardenId: number, duration: number = 2): Promise<void> {
    const garden = await this.prisma.garden.findUnique({
      where: { id: gardenId },
    }) as any;

    if (!garden) {
      throw new NotFoundException(`Vườn với ID ${gardenId} không tồn tại`);
    }

    if (!garden.espId || garden.espId === '-1') {
      throw new NotFoundException(`Vườn ${gardenId} chưa được kết nối với ESP device`);
    }

    await this.updateGardenPumpStatus(gardenId, {
      pumpStatus: 'pending',
      message: `Đang gửi lệnh tưới thủ công trong ${duration} phút`,
    });

    await this.prisma.garden.update({
      where: { id: gardenId },
      data: { irrigationMode: 'manual' } as any,
    });
  const durationSeconds = duration * 60;
    //gửi lệnh đến esp
    try{
      await this.mqttService.sendIrrigationStatus(garden.espId,3);
      await this.mqttService.sendPumpCommand(garden.espId, durationSeconds);
    } catch (err){
      await this.updateGardenPumpStatus(gardenId, {
        pumpStatus: 'error',
        message: `Lỗi gửi lệnh tưới thủ công: ${err.message}`,
        success: false,
      });
       this.logger.error(`Lỗi gửi lệnh tưới thủ công: ${err.message}`);
       return;
    }
  //  Tạo record irrigation với status tạm thời false
  const irrigation = await this.prisma.irrigation.create({
    data: {
      gardenId,
      status: false,
    },
  });

  this.logger.log(
    `Đã gửi lệnh tưới thủ công vườn #${gardenId} trong ${duration} phút (${durationSeconds} giây)`
  );
// Chờ feedback từ ESP tối đa 10 giây
  const feedbackReceived = await this.waitForPumpFeedback(gardenId, 10_000);
  if (!feedbackReceived) {
    await this.updateGardenPumpStatus(gardenId, {
      pumpStatus: 'error',
      message: 'Không nhận phản hồi từ ESP sau 10 giây',
      success: false,
    });
    await this.prisma.irrigation.update({
      where: { id: irrigation.id },
      data: { status: false },
    });
    this.logger.warn(`Chưa nhận phản hồi từ ESP vườn #${gardenId} sau 10 giây`);
  }
  }

   //dừng máy bơm
    async stopIrrigation(gardenId: number): Promise<void> {
      const garden = await this.prisma.garden.findUnique({
        where: { id: gardenId },
      }) as any;
  
      if (!garden) {
        throw new NotFoundException(`Vườn với ID ${gardenId} không tồn tại`);
      }
  
      if (!garden.espId || garden.espId === '-1') {
        throw new NotFoundException(`Vườn ${gardenId} chưa được kết nối với ESP device`);
      }
  
      // Gửi lệnh dừng qua MQTT
      await this.mqttService.sendGardenCommand(garden.espId, 'off');
  
      // Chuyển về OFF (không có chế độ nào)
      await this.prisma.garden.update({
        where: { id: gardenId },
        data: { irrigationMode: null } as any,
      });
  
      // Lưu vào database
      await this.prisma.irrigation.create({
        data: {
          gardenId: gardenId,
          status: false,
        },
      });
  
      this.logger.log(` Đã dừng tưới vườn #${gardenId}`);
    }


  // update irrigation mode
  async updateIrrigationMode(
    gardenId: number,
    mode: string | null,
    userId: number,
  ): Promise<void> {
    const garden = await this.prisma.garden.findUnique({
      where: { id: gardenId },
    });

    if (!garden) {
      throw new NotFoundException(`Vườn với ID ${gardenId} không tồn tại`);
    }

    if (garden.userId !== userId) {
      throw new NotFoundException('Bạn không có quyền thay đổi chế độ tưới của vườn này');
    }

    // Validate mode
    if (mode !== null && !['schedule', 'auto', 'manual'].includes(mode)) {
      throw new BadRequestException('Chế độ tưới không hợp lệ. Phải là: null, "schedule", "auto", hoặc "manual"');
    }

    const updatedGarden = await this.prisma.garden.update({
      where: { id: gardenId },
      data: { irrigationMode: mode } as any,
    }) as any;

    const modeNames: { [key: string]: string } = {
      null: 'OFF',
      schedule: 'Schedule',
      auto: 'Auto',
      manual: 'Manual',
    };

    this.logger.log(` Đã cập nhật chế độ tưới vườn #${gardenId}: ${modeNames[mode || 'null']}`);

    // Gửi status đến ESP dựa trên chế độ được chọn
    if (updatedGarden.espId && updatedGarden.espId !== '-1') {
      if (mode === 'schedule') {
        await this.mqttService.sendIrrigationStatus(updatedGarden.espId, 1);
      } else if (mode === 'auto') {
        await this.mqttService.sendIrrigationStatus(updatedGarden.espId, 2);
      } else if (mode === 'manual') {
        await this.mqttService.sendIrrigationStatus(updatedGarden.espId, 3);
      }
      // Không gửi status khi mode = null (OFF)
    }
  }

 //lay che do tuoi
  async getIrrigationMode(gardenId: number, userId: number) {
    const garden = await this.prisma.garden.findUnique({
      where: { id: gardenId },
      select: { id: true, name: true, userId: true },
    }) as any;

    if (!garden) {
      throw new NotFoundException(`Vườn với ID ${gardenId} không tồn tại`);
    }

    if (garden.userId !== userId) {
      throw new NotFoundException('Bạn không có quyền xem chế độ tưới của vườn này');
    }

    // Lấy lại với đầy đủ thông tin
    const fullGarden = await this.prisma.garden.findUnique({
      where: { id: gardenId },
    }) as any;

    return {
      gardenId: fullGarden.id,
      gardenName: fullGarden.name,
      irrigationMode: fullGarden.irrigationMode || null,
    };
  }

  async getPumpStatus(gardenId: number, userId: number) {
    const garden = await this.prisma.garden.findUnique({
      where: { id: gardenId },
    });

    if (!garden) {
      throw new NotFoundException(`Vườn với ID ${gardenId} không tồn tại`);
    }

    if (garden.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền xem trạng thái bơm của vườn này');
    }

    return {
      gardenId,
      pumpStatus: garden.pumpStatus,
      pumpStatusMessage: garden.pumpStatusMessage,
      lastPumpFeedbackAt: garden.lastPumpFeedbackAt,
      lastPumpSuccess: garden.lastPumpSuccess,
    };
  }

  private async updateGardenPumpStatus(
    gardenId: number,
    data: { pumpStatus: 'idle' | 'pending' | 'on' | 'off' | 'error'; message: string; success?: boolean | null },
  ) {
    await this.prisma.garden.update({
      where: { id: gardenId },
      data: {
        pumpStatus: data.pumpStatus,
        pumpStatusMessage: data.message,
        lastPumpFeedbackAt: new Date(),
        lastPumpSuccess: typeof data.success === 'boolean' ? data.success : null,
      },
    });
  }

  private async waitForPumpFeedback(gardenId: number, timeoutMs: number): Promise<boolean> {
    const interval = 500; // check mỗi 0.5s
    const maxTries = timeoutMs / interval;
    let tries = 0;
  
    return new Promise((resolve) => {
      const timer = setInterval(async () => {
        const garden = await this.prisma.garden.findUnique({ where: { id: gardenId } }) as any;
        if (!garden) {
          clearInterval(timer);
          resolve(false);
          return;
        }
  
        // Nếu pumpStatus đã thay đổi từ 'pending' sang on/off/error
        if (['on', 'off', 'error'].includes(garden.pumpStatus)) {
          clearInterval(timer);
          resolve(true);
          return;
        }
  
        tries++;
        if (tries >= maxTries) {
          clearInterval(timer);
          resolve(false);
        }
      }, interval);
    });
  }

  }