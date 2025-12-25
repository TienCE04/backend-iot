import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ScheduleService } from './schedule.service';
import { CreateScheduleDto } from './dto/createSchedule.dto';
import { UpdateScheduleDto } from './dto/updateSchedule.dto';
import { ScheduleDto } from './dto/schedule.dto';
import { AuthGuard } from 'src/auth/guard/guard';

@ApiTags('Schedule')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('schedule')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  // Tạo lịch tưới mới cho vườn
  @ApiOperation({ summary: 'Create new watering schedule for a garden' })
  @ApiCreatedResponse({
    description: 'Schedule created successfully',
    type: ScheduleDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid data' })
  @ApiNotFoundResponse({ description: 'Garden not found' })
  @ApiForbiddenResponse({ description: 'No permission to create schedule for this garden' })
  @Post()
  async createSchedule(@Body() dto: CreateScheduleDto, @Req() req): Promise<ScheduleDto> {
    const userId = req.user.id;
    return this.scheduleService.createSchedule(dto, userId) as any as ScheduleDto;
  }

  // Lấy tất cả lịch tưới của user (tất cả vườn)
  @ApiOperation({ summary: 'Get all schedules of current user' })
  @ApiOkResponse({
    description: 'List of schedules retrieved successfully',
    type: [ScheduleDto],
  })
  @Get()
  async getUserSchedules(@Req() req): Promise<ScheduleDto[]> {
    const userId = req.user.id;
    return this.scheduleService.getUserSchedules(userId) as any as ScheduleDto[];
  }

  // Lấy tất cả lịch tưới của một vườn
  @ApiOperation({ summary: 'Get all schedules of a specific garden' })
  @ApiOkResponse({
    description: 'List of schedules retrieved successfully',
    type: [ScheduleDto],
  })
  @ApiNotFoundResponse({ description: 'Garden not found' })
  @ApiForbiddenResponse({ description: 'No permission to view schedules of this garden' })
  @Get('garden/:gardenId')
  async getSchedulesByGarden(
    @Param('gardenId', ParseIntPipe) gardenId: number,
    @Req() req,
  ): Promise<ScheduleDto[]> {
    const userId = req.user.id;
    return this.scheduleService.getSchedulesByGarden(gardenId, userId) as any as ScheduleDto[];
  }

  // Lấy lịch tưới theo ID
  @ApiOperation({ summary: 'Get schedule by id' })
  @ApiOkResponse({
    description: 'Schedule retrieved successfully',
    type: ScheduleDto,
  })
  @ApiNotFoundResponse({ description: 'Schedule not found' })
  @ApiForbiddenResponse({ description: 'No permission to view this schedule' })
  @Get(':id')
  async getScheduleById(
    @Param('id', ParseIntPipe) id: number,
    @Req() req,
  ): Promise<ScheduleDto> {
    const userId = req.user.id;
    return this.scheduleService.getScheduleById(id, userId) as any as ScheduleDto;
  }

  // Cập nhật lịch tưới
  @ApiOperation({ summary: 'Update schedule by id' })
  @ApiOkResponse({
    description: 'Schedule updated successfully',
    type: ScheduleDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid data' })
  @ApiNotFoundResponse({ description: 'Schedule not found' })
  @ApiForbiddenResponse({ description: 'No permission to update this schedule' })
  @Put(':id')
  async updateSchedule(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateScheduleDto,
    @Req() req,
  ): Promise<ScheduleDto> {
    const userId = req.user.id;
    return this.scheduleService.updateSchedule(id, dto, userId) as any as ScheduleDto;
  }

  // Xóa lịch tưới
  @ApiOperation({ summary: 'Delete schedule by id' })
  @ApiOkResponse({ description: 'Schedule deleted successfully' })
  @ApiNotFoundResponse({ description: 'Schedule not found' })
  @ApiForbiddenResponse({ description: 'No permission to delete this schedule' })
  @Delete(':id')
  async deleteSchedule(@Param('id', ParseIntPipe) id: number, @Req() req) {
    const userId = req.user.id;
    await this.scheduleService.deleteSchedule(id, userId);
    return { message: 'Delete successfully' };
  }
}

