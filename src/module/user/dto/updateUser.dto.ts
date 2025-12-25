import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsNotEmpty, IsOptional, IsString, ArrayNotEmpty, ArrayUnique } from "class-validator";

export class UpdateUserDto {
    'email'
    'password'
    'roles'
}