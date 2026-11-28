import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { HealthController } from './health.controller';
import { validateEnvironment } from './common/environment';
import { DatabaseModule } from './database/database.module';
import { GuestsModule } from './guests/guests.module';
import { InvitationsModule } from './invitations/invitations.module';
import { CheckInsModule } from './check-ins/check-ins.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { CommonModule } from './common/common.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      validate: validateEnvironment,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: Number(process.env.THROTTLE_TTL_MS ?? 60000),
        limit: Number(process.env.THROTTLE_LIMIT ?? 30),
      },
    ]),
    DatabaseModule,
    CommonModule,
    AuthModule,
    GuestsModule,
    InvitationsModule,
    CheckInsModule,
    DashboardModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
