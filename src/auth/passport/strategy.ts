import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

/**
 * JwtStrategy:
 * - Dùng để xác thực người dùng qua JWT token.
 * - Khi token hợp lệ, payload sẽ được gắn vào req.user.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    // Lấy secret key từ file .env
    const secretKey = configService.get<string>('JWT_SECRET');
    if (!secretKey) {
      throw new Error('JWT_SECRET chưa được cấu hình trong .env');
    }

    super({
      // Lấy token từ header Authorization: Bearer <token>
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false, // không chấp nhận token hết hạn
      secretOrKey: secretKey, // khóa bí mật để verify token
    });
  }

  /**
   * Hàm validate sẽ được Passport gọi khi token hợp lệ.
   * Payload chính là dữ liệu bạn truyền khi sign token trong AuthService.
   */
    async validate(payload: any) {
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Token không hợp lệ');
    }

    // Đảm bảo roles luôn là array, nếu không có thì mặc định là ['USER']
    // Điều này xử lý trường hợp token cũ không có roles
    const roles = payload.roles && Array.isArray(payload.roles) 
      ? payload.roles 
      : ['USER'];

    // Kết quả trả về sẽ được gắn vào req.user
    return {
      id: payload.sub,
      userId: payload.sub,
      email: payload.email,
      roles: roles,
    };
  }
}
