import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsInt, Min, Matches, IsOptional, IsDateString } from 'class-validator';

/**
 * DTO dùng để tạo một Schedule mới (lịch tưới cây cho vườn).
 */
export class CreateScheduleDto {
  @ApiPropertyOptional({
    example: '2025-10-16',
    description: 'Ngày cụ thể theo ISO (YYYY-MM-DD). Bỏ trống nếu là lịch lặp.',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Ngày phải theo định dạng ISO YYYY-MM-DD' })
  date?: string; // ISO date string

  @ApiProperty({
    example: '06:00',
    description: 'Thời gian tưới theo format HH:MM (24h)',
  })
  @IsString({ message: 'Thời gian phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Thời gian không được để trống' })
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Thời gian phải theo format HH:MM (ví dụ: 06:00, 18:00)',
  })
  time: string; // Thời gian tưới (format HH:MM)

  @ApiProperty({
    example: 10,
    description: 'Thời lượng tưới (giây)',
    minimum: 1
  })
  @IsInt({ message: 'Thời lượng tưới phải là số nguyên (giây)' })
  @Min(1, { message: 'Thời lượng tưới tối thiểu là 1 giây' })
  durationSeconds: number; // Thời gian tưới (giây)

  @ApiPropertyOptional({
    example: 'weekly:2',
    description:
      'Quy tắc lặp: "once" | "daily" | "weekly:{0-6}". Bỏ trống nếu là lịch 1 lần (dùng date).',
  })
  @IsOptional()
  @IsString({ message: 'Repeat phải là chuỗi' })
  repeat?: string;

  @ApiProperty({
    example: 1,
    description: 'ID của vườn',
  })
  @IsInt({ message: 'ID vườn phải là số nguyên' })
  @IsNotEmpty({ message: 'ID vườn không được để trống' })
  gardenId: number;
}

