import { ApiProperty } from '@nestjs/swagger';

export class ScheduleDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '2025-10-16', required: false })
  date?: string;

  @ApiProperty({ example: '06:00' })
  time: string;

  @ApiProperty({ example: 10 })
  durationSeconds: number;

  @ApiProperty({ example: 'weekly:2', required: false })
  repeat?: string | null;

  @ApiProperty({ example: true })
  enabled: boolean;

  @ApiProperty({ example: 1 })
  gardenId: number;
}

