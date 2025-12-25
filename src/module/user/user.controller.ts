import { Controller, Body, Delete, Get, Param, Post, Put, NotFoundException} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/createUser.dto';
import { UpdateUserDto } from './dto/updateUser.dto';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { UserDto } from './dto/user.dto';
import { Public } from 'src/decorator/decorator';
import { PositiveIntPipe } from 'src/pipes/CheckId.pipe';
import { EmailPipe } from 'src/pipes/CheckEmail.pipe';

@ApiTags('User')
@Controller('user')
export class UserController {
    constructor(private readonly userService: UserService){}

    @ApiOperation({ summary: 'list User' })
    @ApiOkResponse({
        description: 'list User successfully;',
        type: [UserDto]
    })
    @Get('')
    async findAllUsers(): Promise<UserDto[]> {
    return this.userService.findAllUsers();
  }

  @ApiOperation({ summary: 'create User' })
  @ApiCreatedResponse({description: 'create User successfully', type: CreateUserDto})
  @ApiBadRequestResponse({ description: 'Not successfully created User' })
  @Public()
  @Post('')
  async createUser(@Body() createUser: CreateUserDto): Promise<any> {
    return this.userService.createUser(createUser);
  }

  @ApiOperation({ summary: 'find User by id'})
  @ApiOkResponse({ description: 'Get User with id '})
  @ApiNotFoundResponse({description: 'No One has this ID'})
  @Get('/:id')
  async findUserById (
  @Param('id', PositiveIntPipe) id: number,
  ): Promise<UserDto> {
    return this.userService.findUserById(id);
  }

  @ApiOperation({ summary: 'update User by id' })
  @ApiOkResponse({ description: 'Update User with id ' })
  @ApiNotFoundResponse({ description: 'No One has this id' })
  @Put('/:id')
  async updateUserById(
    @Param('id', PositiveIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserDto> {
    return this.userService.updateUserById(id, updateUserDto);
  }

  @ApiOperation({ summary: 'delete user by id' })
  @ApiOkResponse({ description: 'delete successfully' })
  @ApiNotFoundResponse({ description: 'not found' })
  @Delete('/:id')
  async deleteUserById(@Param('id', PositiveIntPipe) id: number): Promise<{ message: string }> {
  const deleted = await this.userService.deleteUserById(id);
  if (!deleted) {
    throw new NotFoundException('User not found');
  }
  return { message: 'Delete successfully' };
}

  
  @ApiOperation({ summary: 'find User by email'})
  @ApiOkResponse({ description: 'Get User with email '})
  @ApiNotFoundResponse({description: 'No One has this email'})
  @Get('/:email')
  async findUserByEmail (
  @Param('email', EmailPipe) email: string,
  ): Promise<UserDto> {
    return this.userService.findUserByEmail(email);
  }

}