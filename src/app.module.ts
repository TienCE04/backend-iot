import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UserModule } from 'src/module/user/user.module';
import { GardenModule } from './module/garden/garden.module';
import { SensorModule } from './sensor/sensor.module';
import { IrrigationModule } from './irrigation/irrigation.module';
import { PlantModule } from './module/plant/plant.module';
import { ScheduleModule } from './schedule/schedule.module';
import { MqttModule } from './mqtt/mqtt.module';
import { LogModule } from './log/log.module';

@Module({
  imports: [AuthModule, UserModule, GardenModule, SensorModule, IrrigationModule, PlantModule, ScheduleModule, MqttModule, LogModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
