import { IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class SignInDto {
  @ApiProperty({ example: 'sang7cthcsky@gmail.com', description: 'email of the user' })
  @IsNotEmpty({ message: 'email not empty' })
  @Matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, {
    message: 'email not valid',
  })
  email: string;

  @ApiProperty({ example: 'Sang123', description: 'password of the user' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/, {
    message: 'password not valid',
  })
  @IsNotEmpty({ message: 'password not Empty' })
  password: string;
}
