// mqtt.service.ts
import { Injectable, OnModuleInit, Logger, Inject, forwardRef } from '@nestjs/common';
import * as mqtt from 'mqtt';
import { SensorService } from 'src/sensor/sensor.service';
import { IrrigationService } from 'src/irrigation/irrigation.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { LogService } from 'src/log/log.service';

@Injectable()
export class MqttService implements OnModuleInit {
  private readonly logger = new Logger(MqttService.name);
  private client: mqtt.MqttClient;
  // Map để lưu các pending connection checks: espId -> { resolve, reject, timeout }
  private pendingConnectionChecks = new Map<string, { resolve: (status: 'ON' | 'OFF') => void; reject: (error: Error) => void; timeout: NodeJS.Timeout }>();
  // Map để lưu dữ liệu log đang được thu thập: espId -> { year, month, day, hour, minute, second, time }
  private pendingLogs = new Map<string, {
    year?: number;
    month?: number;
    day?: number;
    hour?: number;
    minute?: number;
    second?: number;
    duration?: number;
    timeout?: NodeJS.Timeout;
  }>();

  constructor(
    private sensorService: SensorService,
    @Inject(forwardRef(() => IrrigationService))
    private irrigationService: IrrigationService,
    private prisma: PrismaService,
    private logService: LogService,
  ) {}

  onModuleInit() {
    this.client = mqtt.connect({
      host: '394c577c67aa49a8812ab149ec4997dd.s1.eu.hivemq.cloud',
      port: 8883,
      protocol: 'mqtts',
      username: 'sang2004',
      password: 'Sangdeptrai1',
      reconnectPeriod: 5000, 
    });

    this.client.on('connect', () => {
      this.logger.log(' Đã kết nối đến HiveMQ!');
      
      // 1. conditions/esp_id/{temp, humi, soil} - ESP → Server (JSON format)
      this.client.subscribe('conditions/+', (err) => {
        if (err) {
          this.logger.error(` Lỗi subscribe topic conditions: ${err.message}`);
        } else {
          this.logger.log(' Đã subscribe topic: conditions/+');
        }
      });

      // 2. logs/esp_id/{year, month, day, hour, minute, second, time} - ESP → Server (JSON format)
      this.client.subscribe('logs/+', (err) => {
        if (err) {
          this.logger.error(` Lỗi subscribe topic logs: ${err.message}`);
        } else {
          this.logger.log(' Đã subscribe topic: logs/+');
        }
      });

      // 4. iot/control/feedback/{gardenId} - ESP → Server
      this.client.subscribe('iot/control/feedback/+', (err) => {
        if (err) {
          this.logger.error(` Lỗi subscribe topic iot/control/feedback: ${err.message}`);
        } else {
          this.logger.log(' Đã subscribe topic: iot/control/feedback/+');
        }
      });

      // 10. connect/esp_id/response/{on} - ESP → Server (phản hồi từ ESP)
      this.client.subscribe('connect/+/response/+', (err) => {
        if (err) {
          this.logger.error(` Lỗi subscribe topic connect/response: ${err.message}`);
        } else {
          this.logger.log(' Đã subscribe topic: connect/+/response/+');
        }
      });
    });

    this.client.on('error', (error) => {
      this.logger.error(` Lỗi MQTT: ${error.message}`);
    });

    this.client.on('close', () => {
      this.logger.warn(' MQTT connection đã đóng');
    });

    this.client.on('offline', () => {
      this.logger.warn(' MQTT client đang offline');
    });

    this.client.on('message', async (topic, message) => {
      try {
        const messageStr = message.toString();
        
        // Log tất cả messages để dễ test và debug
        this.logger.log(` [MQTT] Nhận message từ topic [${topic}]: ${messageStr}`);

        // 1. conditions/esp_id/{temp, humi, soil} - ESP → Server
        if (topic.startsWith('conditions/')) {
          await this.handleConditionsData(topic, messageStr);
        }
        // 2. logs/esp_id/{year, month, day, hour, minute, second, time} - ESP → Server
        else if (topic.startsWith('logs/')) {
          await this.handleLogsData(topic, messageStr);
        }
        // 10. connect/esp_id/response/{on, off, error, pending} - ESP → Server
        else if (topic.startsWith('connect/') && topic.includes('/response/')) {
          this.handleConnectionResponse(topic, messageStr);
          await this.handleControlFeedback(topic, messageStr);
        }
      } catch (error) {
        this.logger.error(` Lỗi xử lý message từ topic [${topic}]: ${error.message}`);
      }
    });
  }

 //xử lý dữ liệu cảm biến từ ESP
  private async handleConditionsData(topic: string, message: string) {
    try {
      this.logger.log(` [CONDITIONS] Bắt đầu xử lý dữ liệu từ topic: ${topic}`);
      
      // conditions/esp_id
      const topicParts = topic.split('/');
      const espId = topicParts[1];

      if (!espId) {
        this.logger.warn(` [CONDITIONS] Topic không hợp lệ: ${topic} - Không tìm thấy espId`);
        return;
      }

      this.logger.log(` [CONDITIONS] ESP ID: ${espId}, Message: ${message}`);

      let data: any;
      try {
        data = JSON.parse(message);
        this.logger.log(` [CONDITIONS] Đã parse JSON thành công: temp=${data.temp}, humi=${data.humi}, soil=${data.soil}`);
      } catch (error) {
        this.logger.error(` [CONDITIONS] Không thể parse JSON từ topic ${topic}: ${message} - Lỗi: ${error.message}`);
        return;
      }

      // Validate dữ liệu
      if (typeof data.temp !== 'number' || typeof data.humi !== 'number' || typeof data.soil !== 'number') {
        this.logger.warn(` [CONDITIONS] Dữ liệu conditions không hợp lệ từ ESP ${espId}: ${message} - temp: ${typeof data.temp}, humi: ${typeof data.humi}, soil: ${typeof data.soil}`);
        return;
      }

      const garden = await this.prisma.garden.findFirst({
        where: { espId },
      });

      if (!garden) {
        this.logger.warn(` [CONDITIONS] Không tìm thấy vườn với espId: ${espId} - Dữ liệu vẫn được lưu vào ESPDevice`);
        // Vẫn cập nhật ESPDevice dù không có garden
      } else {
        this.logger.log(` [CONDITIONS] Tìm thấy vườn: Garden ID=${garden.id}, Name=${garden.name}`);
      }

      // Cập nhật ESPDevice (luôn cập nhật dù có garden hay không)
      await this.prisma.espDevice.upsert({
        where: { espId },
        update: {
          temperature: data.temp,
          airHumidity: data.humi,
          soilMoisture: data.soil,
          lastUpdated: new Date(),
          isConnected: true, 
        },
        create: {
          espId,
          temperature: data.temp,
          airHumidity: data.humi,
          soilMoisture: data.soil,
          lastUpdated: new Date(),
          isConnected: true,
        },
      });
      this.logger.log(` [CONDITIONS] Đã cập nhật ESPDevice ${espId}`);

      // Chỉ xử lý nếu có garden
      if (garden) {
        await this.sensorService.createSensorReading({
          temperature: data.temp,
          airHumidity: data.humi,
          soilMoisture: data.soil,
          gardenId: garden.id,
        });
        this.logger.log(` [CONDITIONS] Đã lưu vào Sensor table cho Garden ${garden.id}`);

        // Kiểm tra ngưỡng và tự động tưới 
        const alerts = await this.irrigationService.checkThresholdAndIrrigate(garden.id, {
          temperature: data.temp,
          airHumidity: data.humi,
          soilMoisture: data.soil,
        });

        this.displaySensorData(garden.id, {
          temperature: data.temp,
          airHumidity: data.humi,
          soilMoisture: data.soil,
        }, alerts);
      } else {
        // Log dữ liệu nhận được 
        this.logger.log(
          ` [CONDITIONS] Đã nhận dữ liệu từ ESP ${espId} nhưng chưa có vườn nào được gán: ` +
          `Temp=${data.temp}°C, Humi=${data.humi}%, Soil=${data.soil}%`
        );
      }
    } catch (error) {
      this.logger.error(` [CONDITIONS] Lỗi xử lý dữ liệu conditions: ${error.message}`);
      this.logger.error(` [CONDITIONS] Stack trace: ${error.stack}`);
    }
  }

  //2. xử lý dữ liệu log từ ESP
  private async handleLogsData(topic: string, message: string) {
    try {
      const topicParts = topic.split('/');
      const espId = topicParts[1];

      if (!espId) {
        this.logger.warn(` Topic log không hợp lệ: ${topic}`);
        return;
      }

      let data: any;
      try {
        data = JSON.parse(message);
      } catch (error) {
        this.logger.warn(` Không thể parse JSON từ topic ${topic}: ${message}`);
        return;
      }

      if (
        typeof data.year !== 'number' ||
        typeof data.month !== 'number' ||
        typeof data.day !== 'number' ||
        typeof data.hour !== 'number' ||
        typeof data.minute !== 'number' ||
        typeof data.second !== 'number' ||
        typeof data.time !== 'number'
      ) {
        this.logger.warn(` Dữ liệu log không hợp lệ từ ESP ${espId}: ${message}`);
        return;
      }

      const garden = await this.prisma.garden.findFirst({
        where: { espId },
      }) as any;

      if (!garden) {
        this.logger.warn(` Không tìm thấy vườn với espId: ${espId}`);
        return;
      }

      // Tạo Date từ các giá trị
      const irrigationTime = new Date(
        data.year,
        data.month - 1, // month là 0-indexed
        data.day,
        data.hour,
        data.minute,
        data.second,
      );

      const type = garden.irrigationMode || 'manual';

      // Lưu vào database
      await this.logService.createIrrigationLog({
        gardenId: garden.id,
        irrigationTime,
        duration: data.time,
        status: 'completed',
        type,
        notes: `Tưới từ ESP ${espId}`,
      });

      this.logger.log(
        ` [LOG] Đã lưu log tưới cho vườn ${garden.id} - ESP ${espId}: ` +
        `${irrigationTime.toLocaleString('vi-VN')} - ${data.time} giây`,
      );

      // Nếu đang ở chế độ Manual và đã tưới xong, chuyển về OFF
      if (garden.irrigationMode === 'manual') {
        const currentIrrigation = await this.prisma.irrigation.findFirst({
          where: {
            gardenId: garden.id,
            status: true,
          },
          orderBy: { timestamp: 'desc' },
        });

        if (currentIrrigation) {
          await this.prisma.irrigation.update({
            where: { id: currentIrrigation.id },
            data: { status: false },
          });
        }
        // chuyển về OFF
        await this.prisma.garden.update({
          where: { id: garden.id },
          data: { irrigationMode: null } as any,
        });

        this.logger.log(` [LOG] Đã hoàn thành tưới thủ công - Chuyển về OFF (irrigationMode = null)`);
      }
    } catch (error) {
      this.logger.error(` Lỗi xử lý log: ${error.message}`);
    }
  }


  //xử lý dữ liệu sensor từ ESP

  private async handleSensorData(topic: string, message: string) {
    try {

      const topicParts = topic.split('/');
      const espId = topicParts[1];

      if (!espId) {
        this.logger.warn(` Không thể parse espId từ topic: ${topic}`);
        return;
      }

      const sensorData = JSON.parse(message);

      if (
        typeof sensorData.temperature !== 'number' ||
        typeof sensorData.airHumidity !== 'number' ||
        typeof sensorData.soilMoisture !== 'number'
      ) {
        this.logger.warn(` Dữ liệu sensor không hợp lệ từ esp ${espId}`);
        return;
      }

      const garden = await this.prisma.garden.findFirst({
        where: { espId },
      }) as any;

      if (!garden) {
        this.logger.warn(` Không tìm thấy vườn với espId: ${espId}`);
        return;
      }
      // Lưu vào database
      await this.sensorService.createSensorReading({
        temperature: sensorData.temperature,
        airHumidity: sensorData.airHumidity,
        soilMoisture: sensorData.soilMoisture,
        gardenId: garden.id,
      });

      // Kiểm tra ngưỡng và tự động tưới 
      const alerts = await this.irrigationService.checkThresholdAndIrrigate(garden.id, {
        temperature: sensorData.temperature,
        airHumidity: sensorData.airHumidity,
        soilMoisture: sensorData.soilMoisture,
      });


      // Hiển thị dữ liệu sensor trên console
      this.displaySensorData(garden.id, sensorData, alerts);
    } catch (error) {
      this.logger.error(` Lỗi xử lý dữ liệu sensor: ${error.message}`);
    }
  }

//hiển thị dữ liệu sensor trên console
  private displaySensorData(
    gardenId: number,
    sensorData: { temperature: number; airHumidity: number; soilMoisture: number },
    alerts: any[] = [],
  ) {
    const timestamp = new Date().toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const separator = '═'.repeat(60);
    const line = '─'.repeat(60);

    console.log('\n' + separator);
    console.log(` DỮ LIỆU CẢM BIẾN - VƯỜN #${gardenId}`);
    console.log(` Thời gian: ${timestamp}`);
    console.log(line);
    console.log(`  Nhiệt độ:        ${sensorData.temperature.toFixed(1)}°C`);
    console.log(` Độ ẩm không khí:  ${sensorData.airHumidity.toFixed(1)}%`);
    console.log(` Độ ẩm đất:        ${sensorData.soilMoisture.toFixed(1)}%`);
    
    // Hiển thị cảnh báo nếu có 
    if (alerts.length > 0) {
      console.log(line);
      console.log(' CẢNH BÁO:');
      alerts.forEach((alert) => {
        console.log(`   ${alert.message}`);
      });
    }
    
    console.log(separator);
    console.log(' Đã lưu vào database\n');
  }

 //xu ly feedback tu ESP
  private async handleControlFeedback(topic: string, message: string) {
    try {
      const topicParts = topic.split('/');
      const espId = topicParts[1];

      if (!espId) {
        this.logger.warn(` Không thể parse espId từ topic: ${topic}`);
        return;
      }

      const garden = await this.prisma.garden.findFirst({
        where: { espId },
      }) as any;

      if (!garden) {
        this.logger.warn(` Không tìm thấy vườn với espId: ${espId}`);
        return;
      }

      const gardenId = garden.id;
      let feedback: any = {};
      try {
        feedback = JSON.parse(message);
      } catch (parseError) {
        this.logger.warn(` Feedback không phải JSON từ garden ${gardenId}: ${message}`);
        feedback = { raw: message };
      }

      const { pumpState, statusMessage, successFlag } = this.normalizePumpFeedback(feedback); //chuẩn hóa

      this.logger.log(` Feedback từ garden ${gardenId}: ${JSON.stringify(feedback)}`);
//cập nhật trạng thái
      const updateStatusGarden = await this.prisma.garden.update({
        where: { id: gardenId },
        data: {
          pumpStatus: pumpState,
          pumpStatusMessage: statusMessage,
          lastPumpFeedbackAt: new Date(),
          lastPumpSuccess: successFlag,
        },
        select: {
          irrigationMode: true,
        },
      });

      // Đồng bộ bảng Irrigation (đang tưới hay không)
      const latestIrrigation = await this.prisma.irrigation.findFirst({
        where: { gardenId },
        orderBy: { timestamp: 'desc' },
      });

      if (latestIrrigation) {
        await this.prisma.irrigation.update({
          where: { id: latestIrrigation.id },
          data: { status: pumpState === 'on' || pumpState === 'pending' },
        });
      }

      // Ghi log khi nhận phản hồi hoàn thành hoặc lỗi
      if (pumpState === 'off' || pumpState === 'error') {
        const duration =
          typeof feedback?.duration === 'number'
            ? feedback.duration
            : typeof feedback?.time === 'number'
            ? feedback.time
            : 0;

        await this.logService.createIrrigationLog({
          gardenId,
          duration,
          status: pumpState === 'error' || successFlag === false ? 'failed' : 'completed',
          type: updateStatusGarden?.irrigationMode || 'manual',
          notes: statusMessage,
        });
      }
    } catch (error) {
      this.logger.error(` Lỗi xử lý feedback: ${error.message}`);
    }
  }

  private normalizePumpFeedback(feedback: any): {
    pumpState: 'idle' | 'pending' | 'on' | 'off' | 'error';
    statusMessage: string;
    successFlag: boolean | null;
  } {
    const rawState =
      feedback?.pump ??
      feedback?.state ??
      feedback?.status ??
      feedback?.power ??
      (typeof feedback?.raw === 'string' ? feedback.raw : null);

    let pumpState: 'idle' | 'pending' | 'on' | 'off' | 'error' = 'idle';

    if (typeof rawState === 'string') {
      const normalized = rawState.trim().toLowerCase();
      if (['on', 'started', 'start', 'running', '1', 'true', 'success-on'].includes(normalized)) {
        pumpState = 'on';
      } else if (['pending', 'waiting', 'processing'].includes(normalized)) {
        pumpState = 'pending';
      } else if (['error', 'failed', 'fail'].includes(normalized)) {
        pumpState = 'error';
      } else if (['off', 'stopped', 'stop', '0', 'false'].includes(normalized)) {
        pumpState = 'off';
      }
    } else if (typeof rawState === 'boolean') {
      pumpState = rawState ? 'on' : 'off';
    }

    // Nếu feedback có field explicit
    if (typeof feedback?.success === 'boolean' && feedback.success === false) {
      pumpState = pumpState === 'on' ? 'error' : pumpState;
    }

    const successFlag =
      typeof feedback?.success === 'boolean'
        ? feedback.success
        : pumpState === 'error'
        ? false
        : pumpState === 'on'
        ? true
        : null;

    const statusMessage =
      feedback?.message ||
      feedback?.error ||
      (typeof feedback?.raw === 'string'
        ? feedback.raw
        : pumpState === 'on'
        ? 'Máy bơm đã bật thành công'
        : pumpState === 'off'
        ? 'Máy bơm đã tắt'
        : pumpState === 'pending'
        ? 'Đang chờ ESP phản hồi'
        : pumpState === 'error'
        ? 'Máy bơm gặp lỗi'
        : 'Không có phản hồi cụ thể từ ESP');

    return { pumpState, statusMessage, successFlag };
  }

//3. gửi thông báo gardens đến ESP con ton tai hay khong
  async sendGardenCommand(espId: string, action: 'on' | 'off'): Promise<void> {
    try {
      const topic = `gardens/${espId}/${action}`;
      const payload = action; // Gửi trực tiếp string "on" hoặc "off"

      this.client.publish(topic, payload, (error) => {
        if (error) {
          this.logger.error(` Lỗi gửi thông báo gardens đến ESP ${espId}: ${error.message}`);
        } else {
          this.logger.log(` Đã báo cho ESP ${espId}: vườn ${action === 'on' ? 'đã được thêm' : 'đã được xóa'}`);
        }
      });
    } catch (error) {
      this.logger.error(` Lỗi gửi thông báo gardens: ${error.message}`);
    }
  }

//6. gửi status chế độ tưới đến ESP
  async sendIrrigationStatus(espId: string, status: 1 | 2 | 3): Promise<void> {
    try {
      const topic = `selects/${espId}`;
      const payload = status.toString(); 

      this.client.publish(topic, payload, (error) => {
        if (error) {
          this.logger.error(` Lỗi gửi status đến ESP ${espId}: ${error.message}`);
        } else {
          const statusNames: { [key: number]: string } = {
            1: 'Schedule',
            2: 'Auto',
            3: 'Manual',
          };
          this.logger.log(` Đã gửi status đến ESP ${espId}: ${status} (${statusNames[status]})`);
        }
      });
    } catch (error) {
      this.logger.error(` Lỗi gửi irrigation status: ${error.message}`);
    }
  }

//4. gửi lệnh bật bơm trong thời gian xác định
  async sendPumpCommand(espId: string, duration: number): Promise<void> {
    try {
      const topic = `pump/${espId}`;
      const payload = duration.toString();

      this.client.publish(topic, payload, (error) => {
        if (error) {
          this.logger.error(` Lỗi gửi lệnh pump đến ESP ${espId}: ${error.message}`);
        } else {
          this.logger.log(` Đã gửi lệnh pump đến ESP ${espId}: ${duration} giây`);
        }
      });
    } catch (error) {
      this.logger.error(` Lỗi gửi lệnh pump: ${error.message}`);
    }
  }

//5. gửi dữ liệu chu kỳ sinh học đến ESP
  async sendBioCycle(espId: string, maxTemperature: number, maxAirHumidity: number, minAirHumidity: number): Promise<void> {
    try {
      // 1. Lấy garden theo espId + lấy luôn plant
      const garden = await this.prisma.garden.findFirst({
        where: { espId: espId },
      });
      if (!garden || !garden.plantId) {
        this.logger.error(`Không tìm thấy garden hoặc cây gắn với ESP ${espId}`);
          return;
        }
        // Tìm plant theo plantId
        const plant = await this.prisma.plant.findUnique({
          where: { id: garden.plantId },
        });
        if (!plant) {
          this.logger.error(`Không tìm thấy thông tin cây với plantId ${garden.plantId} cho ESP ${espId}`);
          return;
        }

      const { maxTemperature, maxAirHumidity, minSoilMoisture } = plant;

      const payload = JSON.stringify({
        maxTemperature, 
        maxAirHumidity , 
        minSoilMoisture
      });
      const topic = `bioCycle/${espId}`;
      
      this.client.publish(topic, payload, (error) => {
        if (error) {
          this.logger.error(` Lỗi gửi bioCycle đến ESP ${espId}: ${error.message}`);
        } else {
          this.logger.log(
            ` Đã gửi bioCycle đến ESP ${espId}: ` +
            `Temp=${maxTemperature}°C, Humi=${maxAirHumidity}%, Soil=${minSoilMoisture}%`,
          );
        }
      });
    } catch (error) {
      this.logger.error(` Lỗi gửi bioCycle: ${error.message}`);
    }
  }

//gửi lịch tưới đến ESP
  async sendScheduleAdd(espId: string, scheduleData: {
    repeat: 'once' | 'daily' | 'weekly';
    dayOfWeek?: number; // 0-6 (chỉ dùng nếu weekly), 0 = Chủ nhật
    hour: number;
    minute: number;
    second: number;
    time: number; // thời lượng tưới (giây)
  }): Promise<void> {
    try {
      if (!this.client || !this.client.connected) {
        this.logger.error(` [SCHEDULE/ADD] MQTT client chưa kết nối - Không thể gửi schedule đến ESP ${espId}`);
        return;
      }

      const topic = `schedules/${espId}/add`;
      const payload = JSON.stringify({
        repeat: scheduleData.repeat,
        ...(scheduleData.repeat === 'weekly' && scheduleData.dayOfWeek !== undefined && { dayOfWeek: scheduleData.dayOfWeek }),
        hour: scheduleData.hour,
        minute: scheduleData.minute,
        second: scheduleData.second,
        time: scheduleData.time,
      });

      this.logger.log(` [SCHEDULE/ADD] Đang gửi schedule đến ESP ${espId}`);
      this.logger.log(` [SCHEDULE/ADD] Topic: ${topic}`);
      this.logger.log(` [SCHEDULE/ADD] Payload: ${payload}`);

      this.client.publish(topic, payload, (error) => {
        if (error) {
          this.logger.error(` [SCHEDULE/ADD] Lỗi gửi schedule/add đến ESP ${espId}: ${error.message}`);
        } else {
          this.logger.log(` [SCHEDULE/ADD]  Đã gửi thành công schedule/add đến ESP ${espId}`);
          this.logger.log(` [SCHEDULE/ADD] Chi tiết: repeat=${scheduleData.repeat}, hour=${scheduleData.hour}, minute=${scheduleData.minute}, time=${scheduleData.time}s`);
        }
      });
    } catch (error) {
      this.logger.error(` [SCHEDULE/ADD] Lỗi gửi schedule/add: ${error.message}`);
      this.logger.error(` [SCHEDULE/ADD] Stack trace: ${error.stack}`);
    }
  }

//xóa lịch tưới trên ESP
  async sendScheduleDelete(espId: string, repeat: 'once' | 'daily' | 'weekly', index: number): Promise<void> {
    try {
      const topic = `schedules/${espId}/delete/${repeat}/${index}`;
      const payload = index.toString(); 

      this.client.publish(topic, payload, (error) => {
        if (error) {
          this.logger.error(` Lỗi gửi schedule/delete đến ESP ${espId}: ${error.message}`);
        } else {
          this.logger.log(` Đã gửi schedule/delete đến ESP ${espId}: repeat=${repeat}, index=${index}`);
        }
      });
    } catch (error) {
      this.logger.error(` Lỗi gửi schedule/delete: ${error.message}`);
    }
  }

  /**
   * 10. Gửi phản hồi xác nhận kết nối (Server → ESP)
   * Topic format: connect/esp_id/response/{on}
   * @param espId ID của ESP device
   * @param connected true nếu kết nối thành công
   */
  async sendConnectResponse(espId: string, connected: boolean): Promise<void> {
    try {
      const responseValue = connected ? 'on' : 'off';
      const topic = `connect/${espId}/response/${responseValue}`;
      const payload = responseValue; // Gửi trực tiếp string "on" hoặc "off"

      this.client.publish(topic, payload, (error) => {
        if (error) {
          this.logger.error(` Lỗi gửi connect/response đến ESP ${espId}: ${error.message}`);
        } else {
          this.logger.log(` Đã gửi connect/response đến ESP ${espId}: ${responseValue}`);
        }
      });
    } catch (error) {
      this.logger.error(` Lỗi gửi connect/response: ${error.message}`);
    }
  }

//đồng bộ thời gian thực cho ESP
  async sendRealTime(espId: string): Promise<void> {
    try {
      const now = new Date();
      const topic = `setRealTime/${espId}`;
      const payload = JSON.stringify({
        year: now.getFullYear(),
        month: now.getMonth() + 1, // 1-12
        day: now.getDate(),
        hour: now.getHours(),
        minute: now.getMinutes(),
        second: now.getSeconds(),
      });

      this.client.publish(topic, payload, (error) => {
        if (error) {
          this.logger.error(` Lỗi gửi setRealTime đến ESP ${espId}: ${error.message}`);
        } else {
          this.logger.log(` Đã gửi setRealTime đến ESP ${espId}`);
        }
      });
    } catch (error) {
      this.logger.error(` Lỗi gửi setRealTime: ${error.message}`);
    }
  }

//gửi lệnh điều khiển tưới nước đến ESP
  async sendIrrigationCommand(gardenId: number, command: { action: 'start' | 'stop'; duration?: number }) {
    try {

      const garden = await this.prisma.garden.findUnique({
        where: { id: gardenId },
      });

      if (!garden || !garden.espId || garden.espId === '-1') {
        this.logger.warn(` Vườn ${gardenId} chưa được kết nối với ESP device`);
        return;
      }

      // Sử dụng topic pump để tưới
      if (command.action === 'start') {
        if (command.duration) {
          await this.sendPumpCommand(garden.espId, command.duration);
        } else {
          await this.sendPumpCommand(garden.espId, 180);
        }
      } else {

        this.logger.log(` Yêu cầu dừng tưới cho garden ${gardenId} - ESP sẽ tự động dừng khi hết thời gian`);
      }
    } catch (error) {
      this.logger.error(` Lỗi gửi lệnh điều khiển: ${error.message}`);
    }
  }

//publish message đến topic bất kỳ
  publish(topic: string, payload: string): void {
    this.client.publish(topic, payload, (error) => {
      if (error) {
        this.logger.error(` Lỗi publish đến topic ${topic}: ${error.message}`);
      } else {
        this.logger.debug(` Đã publish đến topic ${topic}: ${payload}`);
      }
    });
  }

//xử lý phản hồi kết nối từ ESP
  private handleConnectionResponse(topic: string, message: string) {
    try {
      const topicParts = topic.split('/');
      const espId = topicParts[1]; // connect/{espId}/response/{on}
      const responseValue = topicParts[3] || message.trim();
      const isConnected = responseValue === 'on';

      const pendingCheck = this.pendingConnectionChecks.get(espId);
      if (pendingCheck) {
        // Clear timeout
        clearTimeout(pendingCheck.timeout);
        // Remove from map
        this.pendingConnectionChecks.delete(espId);
        // Resolve với status tương ứng
        pendingCheck.resolve(isConnected ? 'ON' : 'OFF');
        this.logger.log(` ESP ${espId} đã phản hồi - Status: ${isConnected ? 'ON' : 'OFF'}`);
      }

      // Cập nhật trạng thái ESPDevice (dù có pending check hay không)
      this.prisma.espDevice.upsert({
        where: { espId },
        update: {
          isConnected,
          lastUpdated: new Date(),
        },
        create: {
          espId,
          isConnected,
          lastUpdated: new Date(),
        },
      }).catch(err => {
        this.logger.error(` Lỗi cập nhật ESPDevice: ${err.message}`);
      });

      // Nếu ESP báo đã kết nối -> đồng bộ thời gian thực
      if (isConnected) {
        this.logger.log(` ESP ${espId} đã kết nối - Gửi setRealTime để đồng bộ thời gian`);
        this.sendRealTime(espId).catch(err => {
          this.logger.error(` Lỗi gửi setRealTime cho ESP ${espId}: ${err.message}`);
        });
      }
    } catch (error) {
      this.logger.error(` Lỗi xử lý phản hồi kết nối: ${error.message}`);
    }
  }

 //kiểm tra kết nối ESP device
  async checkEspConnection(espId: string): Promise<'ON' | 'OFF'> {
    return new Promise((resolve, reject) => {
      // Kiểm tra nếu đã có pending check cho espId này
      const existingCheck = this.pendingConnectionChecks.get(espId);
      if (existingCheck) {
        clearTimeout(existingCheck.timeout);
        existingCheck.reject(new Error('Connection check cancelled - new check initiated'));
      }

      // Tạo timeout 2 giây
      const timeout = setTimeout(() => {
        this.pendingConnectionChecks.delete(espId);
        this.logger.warn(` ESP ${espId} không phản hồi sau 2s - Status: OFF`);
        resolve('OFF');
      }, 2000);

      // Lưu pending check
      this.pendingConnectionChecks.set(espId, {
        resolve: (status) => {
          clearTimeout(timeout);
          resolve(status);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
        timeout,
      });

      // Publish message để yêu cầu ESP kiểm tra kết nối
      // Format: connect/{espId}/cmd/{is_connect}
      const topic = `connect/${espId}/cmd/is_connect`;
      const payload = 'is_connect'; // Gửi trực tiếp string "is_connect"
      
      this.client.publish(topic, payload, (error) => {
        if (error) {
          clearTimeout(timeout);
          this.pendingConnectionChecks.delete(espId);
          this.logger.error(` Lỗi gửi yêu cầu kiểm tra kết nối đến ESP ${espId}: ${error.message}`);
          reject(error);
        } else {
          this.logger.log(` Đã gửi yêu cầu kiểm tra kết nối đến ESP ${espId}`);
        }
      });
    });
  }

  /**
   * Kiểm tra trạng thái kết nối MQTT
   */
  isConnected(): boolean {
    return this.client?.connected || false;
  }
}
