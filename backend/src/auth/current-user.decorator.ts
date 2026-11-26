import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from './jwt.strategy';

export const CurrentUser = createParamDecorator((_: unknown, context: ExecutionContext): AuthenticatedUser => {
  return context.switchToHttp().getRequest<{ user: AuthenticatedUser }>().user;
});
