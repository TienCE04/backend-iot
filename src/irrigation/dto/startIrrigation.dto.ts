import { IsNumber, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StartIrrigationDto {
  @ApiProperty({
    description: 'Thời gian tưới (phút)',
    example: 3,
    minimum: 1,
    maximum: 60,
    required: false,
    default: 3,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(60)
  duration?: number = 3;
}

