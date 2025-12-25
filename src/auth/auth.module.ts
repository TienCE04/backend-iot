import { forwardRef, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthGuard, PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserModule } from 'src/module/user/user.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RoleService } from 'src/role/role.service';
import { RoleModule } from 'src/role/role.module';
import { UserService } from 'src/module/user/user.service';
import { JwtStrategy } from './passport/strategy';
import type { StringValue } from 'ms';

@Module({
  imports:[
      forwardRef(() => UserModule),
      ConfigModule,
      PrismaModule,
      PassportModule,
      RoleModule,
      UserModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
        useFactory: async (configService: ConfigService) => {
          const expiresIn = configService.get<string>('JWT_EXPIRES') || '24h';
          const secret = configService.get<string>('JWT_SECRET');
          if (!secret) {
            throw new Error('JWT_SECRET chưa được cấu hình trong .env');
          }
          return {
            secret: secret,
            signOptions: {
              expiresIn: expiresIn as StringValue,
            }
          };
        }
     }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
})
export class AuthModule {}