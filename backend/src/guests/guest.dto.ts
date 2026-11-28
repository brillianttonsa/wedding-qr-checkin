import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

function trimName(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class CreateGuestDto {
  @ApiProperty({ example: 'Ahmed Mohamed' })
  @Transform(({ value }) => trimName(value))
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  fullName!: string;
  @ApiProperty({ example: '0712345678' })
  @IsString()
  @MinLength(9)
  @MaxLength(32)
  phoneNumber!: string;
}
export class UpdateGuestDto extends CreateGuestDto {}
export class GuestQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  search?: string;
  @ApiPropertyOptional({
    enum: ['all', 'checked-in', 'not-checked-in', 'revoked'],
  })
  @IsOptional()
  @IsString()
  status?: 'all' | 'checked-in' | 'not-checked-in' | 'revoked';
}
