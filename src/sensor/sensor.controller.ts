import {
  Controller,
  Get,
  Param,
  Req,
  UseGuards,
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SensorService } from './sensor.service';
import { AuthGuard } from 'src/auth/guard/guard';
import { PrismaService } from 'src/prisma/prisma.service';

@ApiTags('Sensor')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('sensor')
export class SensorController {
  constructor(
    private readonly sensorService: SensorService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Lấy dữ liệu sensor mới nhất của một vườn
   */
  @ApiOperation({ summary: 'Get latest sensor data for a garden' })
  @ApiOkResponse({ description: 'Latest sensor data retrieved successfully' })
  @ApiNotFoundResponse({ description: 'Garden not found' })
  @Get('garden/:gardenId/latest')
  async getLatestSensorData(
    @Param('gardenId', ParseIntPipe) gardenId: number,
    @Req() req,
  ) {
    // Kiểm tra user có quyền xem vườn này không
    const garden = await this.prisma.garden.findUnique({
      where: { id: gardenId },
    });

    if (!garden) {
      throw new NotFoundException('Vườn không tồn tại');
    }

    if (garden.userId !== req.user.id) {
      throw new NotFoundException('Bạn không có quyền xem dữ liệu sensor của vườn này');
    }

    return this.sensorService.getLatestSensorReading(gardenId);
  }

  /**
   * Lấy tất cả dữ liệu sensor của user (tất cả vườn)
   */
  @ApiOperation({ summary: 'Get all sensor data for current user' })
  @ApiOkResponse({ description: 'Sensor data retrieved successfully' })
  @Get('user/all')
  async getUserSensorData(@Req() req) {
    return this.sensorService.getUserSensorData(req.user.id);
  }
}

