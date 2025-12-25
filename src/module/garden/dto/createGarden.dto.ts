import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class CreateGardenDto {
  @ApiProperty({ example: 'Garden 1', description: 'name of the garden' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 1, description: 'id of the plant' })
  @IsInt()
  plantId: number; // id cây từ thư viện Plant
}