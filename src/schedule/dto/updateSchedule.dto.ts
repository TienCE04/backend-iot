import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, Matches, IsBoolean, IsDateString } from 'class-validator';

/**
 * DTO dùng để cập nhật Schedule.
 */
export class UpdateScheduleDto {
  @ApiPropertyOptional({
    example: '2025-10-16',
    description: 'Ngày cụ thể theo ISO (YYYY-MM-DD). Bỏ trống nếu là lịch lặp.',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: 'Ngày phải theo định dạng ISO YYYY-MM-DD' })
  date?: string;

  @ApiProperty({
    example: '06:00',
    description: 'Thời gian tưới theo format HH:MM (24h)',
    required: false,
  })
  @IsString({ message: 'Thời gian phải là chuỗi ký tự' })
  @IsOptional()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Thời gian phải theo format HH:MM (ví dụ: 06:00, 18:00)',
  })
  time?: string;

  @ApiPropertyOptional({
    example: 10,
    description: 'Thời lượng tưới (giây)',
    required: false,
  })
  @IsInt({ message: 'Thời lượng tưới phải là số nguyên (giây)' })
  @IsOptional()
  @Min(1, { message: 'Thời lượng tưới tối thiểu là 1 giây' })
  durationSeconds?: number;

  @ApiPropertyOptional({
    example: 'weekly:2',
    description: 'Quy tắc lặp: "once" | "daily" | "weekly:{0-6}"',
    required: false,
  })
  @IsString({ message: 'Repeat phải là chuỗi' })
  @IsOptional()
  repeat?: string;

  @ApiProperty({
    example: true,
    description: 'Bật/tắt schedule',
    required: false,
  })
  @IsBoolean({ message: 'Enabled phải là boolean' })
  @IsOptional()
  enabled?: boolean;
}

