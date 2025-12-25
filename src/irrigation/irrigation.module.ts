import { Module, forwardRef } from '@nestjs/common';
import { IrrigationService } from './irrigation.service';
import { IrrigationController } from './irrigation.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { MqttModule } from 'src/mqtt/mqtt.module';
import { LogModule } from 'src/log/log.module';

@Module({
  imports: [LogModule ,PrismaModule, forwardRef(() => MqttModule)],
  controllers: [IrrigationController],
  providers: [IrrigationService],
  exports: [IrrigationService],
})
export class IrrigationModule {}