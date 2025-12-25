import { Module } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { ScheduleController } from './schedule.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { MqttModule } from 'src/mqtt/mqtt.module';

@Module({
  imports: [PrismaModule, MqttModule],
  controllers: [ScheduleController],
  providers: [ScheduleService],
  exports: [ScheduleService],
})
export class ScheduleModule {}

