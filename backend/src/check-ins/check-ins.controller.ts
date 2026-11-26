import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; import { RolesGuard } from '../auth/roles.guard'; import { Roles } from '../auth/roles.decorator'; import { UserRole } from '../auth/user-role'; 
import { CurrentUser } from '../auth/current-user.decorator'; import { type AuthenticatedUser } from '../auth/jwt.strategy';
import { CheckInsService } from './check-ins.service'; import { ConfirmCheckInDto, VerifyInvitationDto } from './check-in.dto';

@ApiTags('check-ins') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.GUARD, UserRole.ADMIN) @Controller('check-ins')
export class CheckInsController {
  constructor(private readonly checkIns: CheckInsService) {}
  @Post('verify') verify(@Body() dto: VerifyInvitationDto) { return this.checkIns.verify(dto.token); }
  @Post('confirm') confirm(@Body() dto: ConfirmCheckInDto, @CurrentUser() user: AuthenticatedUser) { return this.checkIns.confirm(dto.token, user.id, dto.idempotencyKey); }
}
