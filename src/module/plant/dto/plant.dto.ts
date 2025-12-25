import { ApiProperty } from '@nestjs/swagger';

// Giả sử bạn có một interface hoặc type cho Plant từ Prisma
// import { Plant } from '@prisma/client';

export class PlantDto {
  
  @ApiProperty({ example: 1, description: 'ID của cây trồng trong thư viện' })
  id: number;
  
  @ApiProperty({ example: 'Hoa Hồng Đỏ', description: 'Tên cây trồng' })
  name: string;
  
  @ApiProperty({ example: 'Cây cảnh đẹp.', description: 'Mô tả', nullable: true })
  description: string | null;
  
  @ApiProperty({ example: 5, description: 'ID của Admin đã tạo cây này' })
  createdById: number;

  @ApiProperty({ example: 20.0, description: 'Nhiệt độ tối thiểu', nullable: true })
  minTemperature?: number | null;

  @ApiProperty({ example: 35.0, description: 'Nhiệt độ tối đa', nullable: true })
  maxTemperature?: number | null;

  @ApiProperty({ example: 40.0, description: 'Độ ẩm không khí tối thiểu', nullable: true })
  minAirHumidity?: number | null;

  @ApiProperty({ example: 80.0, description: 'Độ ẩm không khí tối đa', nullable: true })
  maxAirHumidity?: number | null;

  @ApiProperty({ example: 30.0, description: 'Độ ẩm đất tối thiểu', nullable: true })
  minSoilMoisture?: number | null;

  @ApiProperty({ example: 70.0, description: 'Độ ẩm đất tối đa', nullable: true })
  maxSoilMoisture?: number | null;
}