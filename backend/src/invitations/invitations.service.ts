import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import QRCode from 'qrcode';
import { and, eq, sql } from 'drizzle-orm';
import { ConfigService } from '@nestjs/config';
import { DATABASE, Database } from '../database/database.module';
import { checkIns, guests, invitations } from '../database/schema';
import { normalizeTanzanianPhone } from '../common/phone';
import { StorageService } from '../common/storage.service';
import { RegisterGuestDto } from './invitation.dto';

export type IssuedInvitation = { guest: { id: string; fullName: string; phoneNumber: string }; invitation: { id: string; qrFileName: string }; qrDownloadUrl: string };

@Injectable()
export class InvitationsService {
  constructor(@Inject(DATABASE) private readonly db: Database, private readonly storage: StorageService, private readonly config: ConfigService) {}
  async register(dto: RegisterGuestDto): Promise<IssuedInvitation> {
    const guest = { id: randomUUID(), fullName: dto.fullName.trim(), phoneNumber: normalizeTanzanianPhone(dto.phoneNumber) };
    return this.createGuestAndInvitation(guest);
  }
  async issueForExistingGuest(guestId: string): Promise<IssuedInvitation> {
    const [guest] = await this.db.select().from(guests).where(eq(guests.id, guestId));
    if (!guest) throw new NotFoundException('Guest not found');
    return this.createGuestAndInvitation(guest, false);
  }
  async reissue(guestId: string): Promise<IssuedInvitation> {
    const [current] = await this.db.select({ invitation: invitations, checkInId: checkIns.id }).from(invitations).leftJoin(checkIns, eq(checkIns.invitationId, invitations.id)).where(and(eq(invitations.guestId, guestId), eq(invitations.status, 'ACTIVE')));
    if (!current) throw new NotFoundException('Active invitation not found');
    if (current.checkInId) throw new BadRequestException('An admitted guest cannot receive a replacement invitation');
    const [guest] = await this.db.select().from(guests).where(eq(guests.id, guestId));
    if (!guest) throw new NotFoundException('Guest not found');
    const replacement = await this.createGuestAndInvitation(guest, false, current.invitation.id);
    await this.storage.removeQr(current.invitation.qrFileName);
    return replacement;
  }
  async qrFile(invitationId: string): Promise<{ fileName: string; content: Buffer }> {
    const [invitation] = await this.db.select().from(invitations).where(eq(invitations.id, invitationId));
    if (!invitation) throw new NotFoundException('Invitation not found');
    return { fileName: invitation.qrFileName, content: await readFile(this.storage.qrPath(invitation.qrFileName)) };
  }
  async allQrFiles(): Promise<Array<{ fileName: string; content: Buffer }>> {
    const issued = await this.db.select().from(invitations).where(eq(invitations.status, 'ACTIVE'));
    return Promise.all(issued.map(async (invitation) => ({ fileName: invitation.qrFileName, content: await readFile(this.storage.qrPath(invitation.qrFileName)) })));
  }
  private async createGuestAndInvitation(guest: { id: string; fullName: string; phoneNumber: string }, createGuest = true, revokeInvitationId?: string): Promise<IssuedInvitation> {
    const invitationId = randomUUID(); const token = randomBytes(32).toString('base64url'); const tokenHash = this.hashToken(token); const qrFileName = `invitation_${invitationId}.png`;
    const checkInUrl = new URL(this.config.getOrThrow<string>('QR_BASE_URL')); checkInUrl.searchParams.set('token', token);
    try {
      const png = await QRCode.toBuffer(checkInUrl.toString(), { type: 'png', width: 900, margin: 4, errorCorrectionLevel: 'M', color: { dark: '#000000', light: '#FFFFFFFF' } });
      await writeFile(this.storage.qrPath(qrFileName), png, { flag: 'wx' });
      await this.db.transaction(async (tx) => {
        if (createGuest) await tx.insert(guests).values(guest);
        if (revokeInvitationId) {
          await tx.execute(sql`SELECT 1 FROM invitations WHERE id = ${revokeInvitationId} FOR UPDATE`);
          const [existingCheckIn] = await tx.select({ id: checkIns.id }).from(checkIns).where(eq(checkIns.invitationId, revokeInvitationId));
          if (existingCheckIn) throw new BadRequestException('An admitted guest cannot receive a replacement invitation');
          const revoked = await tx.update(invitations).set({ status: 'REVOKED', updatedAt: new Date() }).where(and(eq(invitations.id, revokeInvitationId), eq(invitations.status, 'ACTIVE'))).returning({ id: invitations.id });
          if (!revoked.length) throw new ConflictException('Invitation was already replaced');
        }
        await tx.insert(invitations).values({ id: invitationId, guestId: guest.id, tokenHash, qrFileName, status: 'ACTIVE' });
      });
    } catch (error: unknown) {
      await this.storage.removeQr(qrFileName);
      if (this.isUnique(error)) throw new ConflictException(createGuest ? 'A guest with this phone number already exists' : 'Guest already has an active invitation');
      throw error;
    }
    return { guest, invitation: { id: invitationId, qrFileName }, qrDownloadUrl: `/api/invitations/${invitationId}/qr` };
  }
  hashToken(token: string): string { return createHash('sha256').update(token).digest('hex'); }
  private isUnique(error: unknown): boolean { return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505'; }
}
