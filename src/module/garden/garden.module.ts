import { Module } from '@nestjs/common';
import { GardenService } from './garden.service';
import { GardenController } from './garden.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { MqttModule } from 'src/mqtt/mqtt.module';

@Module({
  imports: [PrismaModule, MqttModule],
  controllers: [GardenController],
  providers: [GardenService],
  exports: [GardenService],
})
export class GardenModule {}
