import { Injectable, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateGardenDto } from './dto/createGarden.dto';
import { MqttService } from '../../mqtt/mqtt.service';

@Injectable()
export class GardenService {
  private readonly logger = new Logger(GardenService.name);

  constructor(
    private prisma: PrismaService,
    private mqttService: MqttService,
  ) {}

  //tạo vườn mới cho user
  async createGarden(createGardenDto: CreateGardenDto, userId: number) {
    const { name, plantId } = createGardenDto;

    //  Kiểm tra cây có tồn tại không
    const plant = await this.prisma.plant.findUnique({
      where: { id: plantId },
    });
    if (!plant) throw new BadRequestException('Cây không tồn tại trong thư viện.');

   //tao esp ao voi id = -1 de set mac dinh cho vườn chưa kết nối ESP device
    const placeholderEsp = await this.prisma.espDevice.findUnique({
      where: { espId: "-1" },
    });

    if (!placeholderEsp) {
      // Tạo ESPDevice placeholder nếu chưa có
      await this.prisma.espDevice.create({
        data: {
          espId: "-1",
          temperature: null,
          airHumidity: null,
          soilMoisture: null,
        },
      });
    }

    // Tạo vườn với espId mặc định là "-1" (chưa kết nối ESP device)
    return this.prisma.garden.create({ //tạo vườn
      data: {
        name,
        userId,
        plantId,
        espId: "-1", // Mặc định chưa kết nối ESP device
      }
    });
  }
  //xem vuon bang id
  async findGardenById(gardenId: number) {
    const garden = await this.prisma.garden.findUnique({
      where: { id: gardenId },
      include: {
        plant: {
          select: {
            name: true,
          },
        },
        espDevice: {
          select: {
            espId: true,
            temperature: true,
            airHumidity: true,
            soilMoisture: true,
          },
        },
      },
    });
  
    if (!garden) {
      throw new NotFoundException('Không tìm thấy vườn.');
    }
  
    return garden;
  }

  // Cập nhật ESP device cho vườn
  async updateEspDevice(gardenId: number, espId: string, userId: number) {
    // Không cho phép cập nhật về "-1" (chỉ dùng khi tạo mới)
    if (espId === "-1") {
      throw new BadRequestException('Không thể cập nhật espId về "-1". Đây là giá trị mặc định cho vườn chưa kết nối.');
    }

    // Kiểm tra vườn có tồn tại và thuộc về user không
    const garden = await this.prisma.garden.findUnique({
      where: { id: gardenId },
    });

    if (!garden) {
      throw new BadRequestException('Vườn không tồn tại');
    }

    if (garden.userId !== userId) {
      throw new BadRequestException('Không có quyền cập nhật vườn này');
    }

    // Kiểm tra ESP device có tồn tại không, nếu chưa có thì tự động tạo mới
    let espDevice = await this.prisma.espDevice.findUnique({
      where: { espId },
      include: { gardens: true },
    });

    if (!espDevice) {
      // Tự động tạo ESP device mới nếu chưa tồn tại
      espDevice = await this.prisma.espDevice.create({
        data: {
          espId,
          temperature: null,
          airHumidity: null,
          soilMoisture: null,
          isConnected: false,
        },
        include: { gardens: true },
      });
      this.logger.log(` Đã tự động tạo ESP device mới với ID: ${espId}`);
    }

    // Kiểm tra ESP device đã được gán cho vườn khác chưa (chỉ áp dụng cho ESPDevice thực tế, không phải "-1")
    if (espId !== "-1") {
      const existingGarden = await this.prisma.garden.findFirst({
        where: { 
          espId: espId,
          id: { not: gardenId }, // Loại trừ vườn hiện tại
        },
      });

      if (existingGarden) {
        throw new BadRequestException(`ESP device ${espId} đã được gán cho vườn khác.`);
      }
    }

    // Kiểm tra kết nối ESP trước khi cập nhật
    let connectionStatus: 'ON' | 'OFF' = 'OFF';
    try {
      connectionStatus = await this.mqttService.checkEspConnection(espId);
    } catch (error) {
      this.logger.warn(` Lỗi kiểm tra kết nối ESP ${espId}: ${error.message}`);
      connectionStatus = 'OFF';
    }

    // Cập nhật trạng thái kết nối vào ESPDevice
    const isConnected = connectionStatus === 'ON';
    await this.prisma.espDevice.update({
      where: { espId },
      data: { isConnected },
    });

    // Lưu espId cũ để so sánh
    const oldEspId = garden.espId;

    // Cập nhật espId cho vườn
    const updatedGarden = await this.prisma.garden.update({
      where: { id: gardenId },
      data: { espId }
    });

    // Báo cho ESP biết vườn đã được thêm/xóa
    // Nếu espId cũ != "-1" và espId mới != "-1": vườn đã được chuyển sang ESP khác
    // Nếu espId cũ == "-1" và espId mới != "-1": vườn đã được thêm vào ESP
    // Nếu espId cũ != "-1" và espId mới == "-1": không nên xảy ra (đã check ở trên)
    if (oldEspId === "-1" && espId !== "-1") {
      // Vườn mới được thêm vào ESP
      await this.mqttService.sendGardenCommand(espId, 'on');
      this.logger.log(` Đã báo cho ESP ${espId}: vườn ${gardenId} đã được thêm`);
    } else if (oldEspId !== "-1" && espId !== "-1" && oldEspId !== espId) {
      // Vườn được chuyển sang ESP khác
      await this.mqttService.sendGardenCommand(oldEspId, 'off');
      await this.mqttService.sendGardenCommand(espId, 'on');
      this.logger.log(` Đã báo cho ESP ${oldEspId}: vườn ${gardenId} đã được xóa`);
      this.logger.log(` Đã báo cho ESP ${espId}: vườn ${gardenId} đã được thêm`);
    }

    // Trả về kết quả kèm connection status
    return {
      ...updatedGarden,
      connectionStatus,
    } as any;
  }

  //lấy danh sách vườn của user
  async findUserGardens(userId: number) {
    return this.prisma.garden.findMany({
      where: { userId },
    });
  }

    // Xóa vườn (chỉ chủ vườn được xóa)
  async deleteGarden(id: number, userId: number) {
    const garden = await this.prisma.garden.findUnique({ where: { id } });
    if (!garden) throw new BadRequestException('Vườn không tồn tại');
    if (garden.userId !== userId) throw new BadRequestException('Không có quyền xóa vườn này');

    // Lưu espId trước khi xóa để báo cho ESP
    const espId = garden.espId;

    // Xóa vườn
    const deleted = await this.prisma.garden.delete({ where: { id } });

    // Báo cho ESP biết vườn đã được xóa (nếu có espId và không phải "-1")
    if (espId && espId !== "-1") {
      await this.mqttService.sendGardenCommand(espId, 'off');
      this.logger.log(` Đã báo cho ESP ${espId}: vườn ${id} đã được xóa`);
    }

    return deleted;
  }
}
