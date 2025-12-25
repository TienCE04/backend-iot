import { Module, forwardRef } from '@nestjs/common';
import { MqttService } from './mqtt.service';
import { SensorModule } from 'src/sensor/sensor.module';
import { IrrigationModule } from 'src/irrigation/irrigation.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { LogModule } from 'src/log/log.module';

@Module({
  imports: [
    SensorModule, 
    forwardRef(() => IrrigationModule),
    PrismaModule,
    LogModule,
  ],
  providers: [MqttService],
  exports: [MqttService],
})
export class MqttModule {}

