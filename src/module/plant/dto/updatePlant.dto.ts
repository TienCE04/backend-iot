import { PartialType, ApiProperty } from '@nestjs/swagger';
import { CreatePlantDto } from './createPlant.dto';
import { IsString, IsOptional, MaxLength } from 'class-validator';


export class UpdatePlantDto extends PartialType(CreatePlantDto) {

  @ApiProperty({ 
    example: 'Hoa Hồng Vàng Leo', 
    description: 'Tên cây (tùy chọn cập nhật)', 
    required: false,
    maxLength: 100
  })
  @IsString({ message: 'Tên cây phải là chuỗi ký tự' })
  @IsOptional()
  @MaxLength(100, { message: 'Tên cây không được vượt quá 100 ký tự' })
  name?: string;

  @ApiProperty({ 
    example: 'Rất dễ trồng, kháng bệnh tốt.', 
    description: 'Mô tả, công dụng, cách trồng (tùy chọn cập nhật)', 
    required: false 
  })
  @IsString({ message: 'Mô tả phải là chuỗi ký tự' })
  @IsOptional()
  description?: string;
}