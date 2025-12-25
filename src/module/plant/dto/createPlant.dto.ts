import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, MaxLength, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO dùng để tạo một Plant mới (Thêm cây vào thư viện).
 * Chỉ Admin mới được phép sử dụng.
 */
export class CreatePlantDto {
  
  @ApiProperty({ 
    example: 'Hoa Hồng Đỏ', 
    description: 'Tên độc nhất của cây trồng', 
    maxLength: 100 
  })
  @IsString({ message: 'Tên cây phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Tên cây không được để trống' })
  @MaxLength(100, { message: 'Tên cây không được vượt quá 100 ký tự' })
  name: string; // Tên cây (Plant.name)

  @ApiProperty({ 
    example: 'Loại cây cảnh, có nhiều màu sắc. Thích hợp trồng nơi có nắng, cần tưới nước thường xuyên.', 
    description: 'Mô tả, công dụng, cách trồng', 
    required: false 
  })
  @IsString({ message: 'Mô tả phải là chuỗi ký tự' })
  @IsOptional()
  description?: string; // Mô tả, công dụng, cách trồng (Plant.description)

  @ApiProperty({ 
    example: 15.0, 
    description: 'Nhiệt độ tối thiểu (°C)', 
    required: false,
    type: Number
  })
  @IsOptional()
  @IsNumber({}, { message: 'Nhiệt độ tối thiểu phải là số' })
  @Type(() => Number)
  @Min(-50, { message: 'Nhiệt độ tối thiểu không được nhỏ hơn -50°C' })
  @Max(60, { message: 'Nhiệt độ tối thiểu không được lớn hơn 60°C' })
  minTemperature?: number; // Nhiệt độ tối thiểu (°C)

  @ApiProperty({ 
    example: 35.0, 
    description: 'Nhiệt độ tối đa (°C)', 
    required: false,
    type: Number
  })
  @IsOptional()
  @IsNumber({}, { message: 'Nhiệt độ tối đa phải là số' })
  @Type(() => Number)
  @Min(-50, { message: 'Nhiệt độ tối đa không được nhỏ hơn -50°C' })
  @Max(60, { message: 'Nhiệt độ tối đa không được lớn hơn 60°C' })
  maxTemperature?: number; // Nhiệt độ tối đa (°C)

  @ApiProperty({ 
    example: 40.0, 
    description: 'Độ ẩm không khí tối thiểu (%)', 
    required: false,
    type: Number
  })
  @IsOptional()
  @IsNumber({}, { message: 'Độ ẩm không khí tối thiểu phải là số' })
  @Type(() => Number)
  @Min(0, { message: 'Độ ẩm không khí tối thiểu không được nhỏ hơn 0%' })
  @Max(100, { message: 'Độ ẩm không khí tối thiểu không được lớn hơn 100%' })
  minAirHumidity?: number; // Độ ẩm không khí tối thiểu (%)

  @ApiProperty({ 
    example: 80.0, 
    description: 'Độ ẩm không khí tối đa (%)', 
    required: false,
    type: Number
  })
  @IsOptional()
  @IsNumber({}, { message: 'Độ ẩm không khí tối đa phải là số' })
  @Type(() => Number)
  @Min(0, { message: 'Độ ẩm không khí tối đa không được nhỏ hơn 0%' })
  @Max(100, { message: 'Độ ẩm không khí tối đa không được lớn hơn 100%' })
  maxAirHumidity?: number; // Độ ẩm không khí tối đa (%)

  @ApiProperty({ 
    example: 30.0, 
    description: 'Độ ẩm đất tối thiểu (%) - dưới ngưỡng này cần tưới', 
    required: false,
    type: Number
  })
  @IsOptional()
  @IsNumber({}, { message: 'Độ ẩm đất tối thiểu phải là số' })
  @Type(() => Number)
  @Min(0, { message: 'Độ ẩm đất tối thiểu không được nhỏ hơn 0%' })
  @Max(100, { message: 'Độ ẩm đất tối thiểu không được lớn hơn 100%' })
  minSoilMoisture?: number; // Độ ẩm đất tối thiểu (%) - dưới ngưỡng này cần tưới

  @ApiProperty({ 
    example: 80.0, 
    description: 'Độ ẩm đất tối đa (%)', 
    required: false,
    type: Number
  })
  @IsOptional()
  @IsNumber({}, { message: 'Độ ẩm đất tối đa phải là số' })
  @Type(() => Number)
  @Min(0, { message: 'Độ ẩm đất tối đa không được nhỏ hơn 0%' })
  @Max(100, { message: 'Độ ẩm đất tối đa không được lớn hơn 100%' })
  maxSoilMoisture?: number; // Độ ẩm đất tối đa (%)

}