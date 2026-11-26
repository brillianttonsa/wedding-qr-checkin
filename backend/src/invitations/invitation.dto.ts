import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { CreateGuestDto } from '../guests/guest.dto';

export class RegisterGuestDto extends CreateGuestDto {}
export class ReissueInvitationDto { @ApiProperty({ example: 'Lost printed invitation' }) @IsString() @MinLength(3) @MaxLength(200) reason!: string; }
