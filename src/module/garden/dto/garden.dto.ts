import { ApiProperty } from '@nestjs/swagger';
import { PlantDto } from 'src/module/plant/dto/plant.dto';

export class GardenDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Vườn rau của tôi' })
  name: string;

  @ApiProperty({ example: 2 })
  plantId: number;

  @ApiProperty({ example: 5 })
  userId: number;

  @ApiProperty({ 
    example: 'schedule', 
    description: 'Chế độ tưới: null (OFF), "schedule" (Tưới theo lịch), "auto" (Tưới tự động), "manual" (Tưới thủ công)',
    enum: [null, 'schedule', 'auto', 'manual'],
    required: false,
  })
  irrigationMode: string | null;

  @ApiProperty({
    example: 'idle',
    description: 'Trạng thái bơm hiện tại: idle | pending | on | off | error',
  })
  pumpStatus: string;

  @ApiProperty({
    example: 'Đang chờ ESP phản hồi',
    required: false,
    nullable: true,
  })
  pumpStatusMessage?: string | null;

  @ApiProperty({
    example: '2025-11-18T10:00:00.000Z',
    required: false,
    nullable: true,
  })
  lastPumpFeedbackAt?: Date | null;

  @ApiProperty({
    example: true,
    required: false,
    nullable: true,
    description: 'Kết quả phản hồi gần nhất từ ESP',
  })
  lastPumpSuccess?: boolean | null;
}
