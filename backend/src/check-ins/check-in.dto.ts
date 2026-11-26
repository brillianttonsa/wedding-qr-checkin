import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, Matches } from 'class-validator';

export class VerifyInvitationDto {
  @ApiProperty({ description: 'Opaque token extracted from the QR URL' })
  @IsString() @Matches(/^[A-Za-z0-9_-]{43}$/) token!: string;
}
export class ConfirmCheckInDto extends VerifyInvitationDto {
  @ApiProperty({ format: 'uuid', description: 'A new client-generated key per intentional confirmation' })
  @IsUUID() idempotencyKey!: string;
}
