import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { IrrigationService } from './irrigation.service';
import { UpdateIrrigationModeDto } from './dto/updateIrrigationModes.dto';
import { StartIrrigationDto } from './dto/startIrrigation.dto';
import { AuthGuard } from 'src/auth/guard/guard';

@ApiTags('Irrigation')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('irrigation')
export class IrrigationController {
  constructor(private readonly irrigationService: IrrigationService) {}

//start manual irrigation
  @ApiOperation({ summary: 'Start manual irrigation for a garden' })
  @ApiOkResponse({ description: 'Irrigation started successfully' })
  @ApiNotFoundResponse({ description: 'Garden not found' })
  @Post(':gardenId/start')
  async startIrrigation(
    @Param('gardenId', ParseIntPipe) gardenId: number,
    @Body() dto: StartIrrigationDto,
    @Req() req,
  ) {
    await this.irrigationService.startIrrigation(gardenId, dto.duration);
    return { message: 'Đã bắt đầu tưới nước', gardenId, duration: dto.duration };
  }
//stop manual irrigation
 @ApiOperation({ summary: 'Stop manual irrigation for a garden' })
 @ApiOkResponse({ description: 'Irrigation stopped successfully' })
 @ApiNotFoundResponse({ description: 'Garden not found' })
 @Post(':gardenId/stop')
 async stopIrrigation(@Param('gardenId', ParseIntPipe) gardenId: number, @Req() req) {
   await this.irrigationService.stopIrrigation(gardenId);
   return { message: 'Đã dừng tưới nước', gardenId };
 }


//Update irrigation mode
  @ApiOperation({
    summary: 'Update irrigation mode for a garden',
    description: 'Chỉ chọn 1 trong 3 chế độ: "schedule" (Tưới theo lịch), "auto" (Tưới tự động), "manual" (Tưới thủ công), hoặc null (OFF)',
  })
  @ApiOkResponse({ description: 'Irrigation mode updated successfully' })
  @ApiNotFoundResponse({ description: 'Garden not found' })
  @ApiBadRequestResponse({ description: 'Invalid irrigation mode' })
  @Patch(':gardenId/mode')
  async updateIrrigationMode(
    @Param('gardenId', ParseIntPipe) gardenId: number,
    @Body() dto: UpdateIrrigationModeDto,
    @Req() req,
  ) {
    await this.irrigationService.updateIrrigationMode(
      gardenId,
      dto.irrigationMode ?? null,
      req.user.id,
    );
    return {
      message: 'Đã cập nhật chế độ tưới',
      gardenId,
      irrigationMode: dto.irrigationMode ?? null,
    };
  }

//Get irrigation mode
  @ApiOperation({ summary: 'Get current irrigation mode for a garden' })
  @ApiOkResponse({ description: 'Irrigation mode retrieved successfully' })
  @ApiNotFoundResponse({ description: 'Garden not found' })
  @Get(':gardenId/mode')
  async getIrrigationMode(@Param('gardenId', ParseIntPipe) gardenId: number, @Req() req) {
    return this.irrigationService.getIrrigationMode(gardenId, req.user.id);
  }

  //lấy trạng thái máy bơm
  @ApiOperation({ summary: 'Get latest pump status for a garden' })
  @ApiOkResponse({ description: 'Pump status retrieved successfully' })
  @ApiNotFoundResponse({ description: 'Garden not found' })
  @Get(':gardenId/pump-status')
  async getPumpStatus(@Param('gardenId', ParseIntPipe) gardenId: number, @Req() req) {
    return this.irrigationService.getPumpStatus(gardenId, req.user.id);
  }
}