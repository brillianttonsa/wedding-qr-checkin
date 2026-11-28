import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { IsInt, IsString, IsUrl, Min, validateSync } from 'class-validator';

class EnvironmentVariables {
  @IsString() POSTGRES_URL!: string;
  @IsString() JWT_SECRET!: string;
  @IsString() CORS_ORIGIN!: string;
  @IsString() STORAGE_DIR!: string;
  // @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  // QR_BASE_URL!: string;
  @IsUrl({
  require_tld: false,
  require_protocol: true,
})
QR_BASE_URL! : string;
  @IsInt() @Min(1) PORT = 3000;
}

export function validateEnvironment(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length)
    throw new Error(`Invalid environment: ${errors.toString()}`);
  if (validated.JWT_SECRET.length < 32)
    throw new Error('JWT_SECRET must be at least 32 characters');
  return validated;
}
