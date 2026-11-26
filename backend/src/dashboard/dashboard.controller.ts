import { Controller, Get, UseGuards } from '@nestjs/common'; import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; import { RolesGuard } from '../auth/roles.guard'; import { Roles } from '../auth/roles.decorator'; import { UserRole } from '../auth/user-role'; import { DashboardService } from './dashboard.service';
@ApiTags('dashboard') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN) @Controller('dashboard')
export class DashboardController { constructor(private readonly dashboard: DashboardService) {} @Get('statistics') statistics() { return this.dashboard.statistics(); } }
