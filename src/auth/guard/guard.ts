import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard as NestAuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from 'src/decorator/decorator';

/**
 * Guard này dùng để xác thực JWT token.
 * Nó sẽ:
 *  - Bỏ qua route có @Public()
 *  - Kiểm tra token hợp lệ
 *  - Nếu hợp lệ → gắn user payload vào req.user
 *  - Nếu sai → throw UnauthorizedException
 */
@Injectable()
export class AuthGuard extends NestAuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Nếu là public route → bỏ qua guard
    if (isPublic) {
      return true;
    }

    // Nếu không phải public route → chạy JWT guard mặc định
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    // Log để debug
    if (err) {
      console.error('Auth Guard Error:', err);
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }
    
    if (!user) {
      console.error('Auth Guard: No user found. Info:', info);
      // Nếu có thông tin về lỗi từ passport, hiển thị chi tiết hơn
      if (info) {
        if (info.name === 'TokenExpiredError') {
          throw new UnauthorizedException('Token đã hết hạn');
        }
        if (info.name === 'JsonWebTokenError') {
          throw new UnauthorizedException('Token không hợp lệ');
        }
        if (info.name === 'NotBeforeError') {
          throw new UnauthorizedException('Token chưa được kích hoạt');
        }
      }
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }

    // Trả user về cho controller
    return user;
  }
}
