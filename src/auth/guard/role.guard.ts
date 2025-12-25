import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { IS_PUBLIC_KEY, ROLES_KEY } from 'src/decorator/decorator';
import { Role } from 'src/role/role.enum';


    @Injectable()
    export class RolesAuthGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
        ]);
        console.log({ requiredRoles });

        if (!requiredRoles) {
        return true;
        }
        const request = await context.switchToHttp().getRequest();
        const user = request.user;
        return requiredRoles.some((role) => {
        return user.roles?.includes(role);
        });
    } 
    }
