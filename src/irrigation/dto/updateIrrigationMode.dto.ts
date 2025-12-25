import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IrrigationMode } from '../irrigation-mode.enum';

export class UpdateIrrigationModeDto {
  @ApiProperty({
    description: 'Chế độ tưới: manual, schedule, hoặc auto',
    enum: IrrigationMode,
    example: IrrigationMode.AUTO,
  })
  @IsNotEmpty()
  @IsEnum(IrrigationMode)
  mode: IrrigationMode;
}

