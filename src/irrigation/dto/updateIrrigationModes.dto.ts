import { IsOptional, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateIrrigationModeDto {
  @ApiPropertyOptional({
    description: 'Chế độ tưới: null (OFF), "schedule" (Tưới theo lịch), "auto" (Tưới tự động), "manual" (Tưới thủ công)',
    example: 'schedule',
    enum: [null, 'schedule', 'auto', 'manual'],
  })
  @IsOptional()
  @IsIn([null, 'schedule', 'auto', 'manual'], {
    message: 'Chế độ tưới phải là: null, "schedule", "auto", hoặc "manual"',
  })
  irrigationMode?: string | null;
}

