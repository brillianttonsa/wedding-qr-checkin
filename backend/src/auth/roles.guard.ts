import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedUser } from './jwt.strategy';
import { ROLES_KEY } from './roles.decorator';
import { UserRole } from './user-role';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!roles) return true;
    const user = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>().user;
    return Boolean(user && roles.includes(user.role));
  }
}
