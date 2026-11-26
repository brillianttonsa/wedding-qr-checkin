import { Module } from '@nestjs/common'; 
import { CheckInsController } from './check-ins.controller'; 
import { CheckInsService } from './check-ins.service'; 
import { InvitationsModule } from '../invitations/invitations.module';
@Module({ imports: [InvitationsModule], controllers: [CheckInsController], providers: [CheckInsService] }) export class CheckInsModule {}
