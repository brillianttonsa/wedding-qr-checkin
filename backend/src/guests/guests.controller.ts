import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; import { RolesGuard } from '../auth/roles.guard'; import { Roles } from '../auth/roles.decorator'; import { UserRole } from '../auth/user-role';
import { CreateGuestDto, GuestQueryDto, UpdateGuestDto } from './guest.dto'; import { GuestsService } from './guests.service';

@ApiTags('guests') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN) @Controller('guests')
export class GuestsController {
  constructor(private readonly guests: GuestsService) {}
  @Post() create(@Body() dto: CreateGuestDto) { return this.guests.create(dto); }
  @Get() list(@Query() query: GuestQueryDto) { return this.guests.list(query); }
  @Get(':id') find(@Param('id') id: string) { return this.guests.find(id); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateGuestDto) { return this.guests.update(id, dto); }
}
