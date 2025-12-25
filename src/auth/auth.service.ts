//JWT

import { Injectable, InternalServerErrorException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from 'src/module/user/dto/createUser.dto';
import { UserService } from 'src/module/user/user.service';
import { JwtService } from '@nestjs/jwt';
import { Role } from 'src/role/role.enum';


@Injectable()
export class AuthService {
    constructor(
    private readonly userservice: UserService,
    private readonly jwtService: JwtService,
    private readonly prismaService: PrismaService
    ){}

    async validateUser(email: string, password: string): Promise<any> {
        const user = await this.prismaService.user.findUnique({
            where: {email},
            include: { role: true }
        });
        if(!user) return null;
        const isPasswordValid = await this.userservice.comparePassword(password, user.password);
        if(!isPasswordValid) return null;
        const { password: _, ...result} = user;
        return result;
    }

    async SignIn(email: string, password: string): Promise<{ access_token: string }> {
        const user = await this.validateUser(email, password);
        if(!user){
            throw new UnauthorizedException('email or password is incorrect');
        }
        const payload = { 
            sub: user.id, 
            email: user.email, 
            roles: [user.role.name] // Chuyển role name thành array để guard có thể check
        }
        const token = this.jwtService.sign(payload);
        return { access_token: token}
    }

    async register(data: CreateUserDto){
        const {email, password, username} = data;
        try{
            const hashedPassword = await this.userservice.hashPassword(password)
            await this.prismaService.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    username,
                    role: {
                        connect: { name: 'USER' }
                    }
                }
            })
        }
    catch (error) {
  if (error.code === 'P2002') {
    throw new BadRequestException('Email đã tồn tại');
  }
  throw new InternalServerErrorException('Server error !!!');
}

}
}