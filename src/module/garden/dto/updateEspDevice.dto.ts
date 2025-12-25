import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateEspDeviceDto {
  @ApiProperty({ 
    example: 'ESP123456', 
    description: 'Hashcode ID của ESP device cần kết nối' 
  })
  @IsString()
  @IsNotEmpty()
  espId: string; // Hashcode ID từ ESP hardware
}

