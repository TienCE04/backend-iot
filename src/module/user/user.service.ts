import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { CreateUserDto } from './dto/createUser.dto';
import { UpdateUserDto } from './dto/updateUser.dto';
import *as bcrypt from 'bcrypt';
import {PrismaService}  from 'src/prisma/prisma.service';
import { Role } from 'src/role/role.enum';
import { connect } from 'http2';


@Injectable()
export class UserService {
    constructor(private readonly prismaService: PrismaService) {}

    //mã hóa password
    async hashPassword(password: string): Promise<string> {
        return await bcrypt.hash(password, 10)
    }   

    //so sánh password
    async comparePassword(
        plaintPassword: string,
        hashedPassword: string,
    ): Promise<boolean> {
        console.log(plaintPassword, hashedPassword);
        return await bcrypt.compare(plaintPassword,hashedPassword)
    }

    async createUser(createUser: CreateUserDto) {
        const { email, password, username } = createUser;
        try{
            //hash password
            const hashedPassword = await this.hashPassword(password);
            //create user
            const newUser = await this.prismaService.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    username,
                    role: {
                      connect: { name: 'USER' },
                     }
                },
            });
            return newUser;

        } catch (error) {
            if (error.code === 'P2002') { throw new BadRequestException('Email đã tồn tại');}
      throw new InternalServerErrorException('Server error !!!');
        }
    }   

    async findAllUsers(){
        try{
        return await this.prismaService.user.findMany();
        } catch (error) {
        throw new InternalServerErrorException('Server error !!!');
    }
    }
    async findUserByEmail(email: string){
        try{
            const user = await this.prismaService.user.findUnique({
                where: {email}
            });

            if (!user) 
                throw new BadRequestException(
                    'không tồn tại user với email này',
            );

            return user;
        } catch (error){
        throw new InternalServerErrorException('Server error !!!');
        }
    }
      // Tìm user theo ID
  async findUserById(id: number) {
    try {
      const user = await this.prismaService.user.findUnique({
        where: { id },
      });

      if (!user) {
        throw new BadRequestException(`Không tồn tại user với id = ${id}`);
      }

      return user;
    } catch (error) {
      throw new InternalServerErrorException('Server error !!!');
    }
  }

  // Cập nhật user theo ID
  async updateUserById(id: number, updateUserDto: UpdateUserDto) {
    const { email, password, roles } = updateUserDto;

    try {
      // Kiểm tra user có tồn tại không
      const existingUser = await this.prismaService.user.findUnique({ where: { id } });
      if (!existingUser) {
        throw new BadRequestException(`Không tồn tại user với id = ${id}`);
      }

      // Hash lại mật khẩu nếu có thay đổi
      let hashedPassword = existingUser.password;
      if (password) {
        hashedPassword = await this.hashPassword(password);
      }
      const roleData = roles ? { connect: { name: roles } } : undefined;

      // Cập nhật user
      const updatedUser = await this.prismaService.user.update({
        where: { id },
        data: {
          email: email ?? existingUser.email,
          password: hashedPassword,
          role: roleData,
        },
      });

      return updatedUser;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new BadRequestException('Email đã tồn tại');
      }
      throw new InternalServerErrorException('Server error !!!');
    }
  }

  // Xóa user theo ID
  async deleteUserById(id: number) {
    try {
      const existingUser = await this.prismaService.user.findUnique({ where: { id } });
      if (!existingUser) {
        throw new BadRequestException(`Không tồn tại user với id = ${id}`);
      }

      await this.prismaService.user.delete({ where: { id } });

      return { message: `User có id = ${id} đã được xóa thành công` };
    } catch (error) {
      throw new InternalServerErrorException('Server error !!!');
    }
  }
}