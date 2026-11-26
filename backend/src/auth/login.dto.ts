import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'guard1' })
  @IsString() @MinLength(3) @MaxLength(80) username!: string;

  @ApiProperty({ example: 'a strong password' })
  @IsString() @MinLength(12) @MaxLength(128) password!: string;
}
