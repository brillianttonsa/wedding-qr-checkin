import { Module } from '@nestjs/common';
import { InvitationsModule } from '../invitations/invitations.module';
import { GuestsService } from './guests.service';
import { GuestsController } from './guests.controller';
@Module({
  imports: [InvitationsModule],
  providers: [GuestsService],
  controllers: [GuestsController],
  exports: [GuestsService],
})
export class GuestsModule {}
