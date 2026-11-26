import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { HealthController } from './health.controller';
import { validateEnvironment } from './common/environment';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'], validate: validateEnvironment }),
    ThrottlerModule.forRoot([{ ttl: Number(process.env.THROTTLE_TTL_MS ?? 60000), limit: Number(process.env.THROTTLE_LIMIT ?? 30) }]),
    DatabaseModule,
    AuthModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
