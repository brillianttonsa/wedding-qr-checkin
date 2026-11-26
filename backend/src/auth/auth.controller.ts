import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './login.dto';
import { CurrentUser } from './current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { AuthenticatedUser } from './jwt.strategy';

@ApiTags('authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post('login') login(@Body() dto: LoginDto) { return this.auth.login(dto); }
  @Get('me') @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  me(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser { return user; }
}
