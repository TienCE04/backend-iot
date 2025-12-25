import { Module } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaModule } from "src/prisma/prisma.module";
import { PlantController } from "./plant.controller";
import { PlantService } from "./plant.service";

@Module({
    imports: [PrismaModule],
    providers: [PlantService],
    controllers: [PlantController],
    exports: [PlantService],
})
export class PlantModule {}