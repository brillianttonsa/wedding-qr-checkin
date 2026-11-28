import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import QRCode from 'qrcode';
import { and, eq, sql } from 'drizzle-orm';
import { ConfigService } from '@nestjs/config';
import { DATABASE, type Database } from '../database/database.module';
import { checkIns, guests, invitations } from '../database/schema';
import { normalizeTanzanianPhone } from '../common/phone';
import { isPostgresUniqueViolation } from '../common/postgres-error';
import { qrFileNameForGuest } from '../common/qr-file-name';
import { StorageService } from '../common/storage.service';
import { makeCard } from '../make-card';
import { RegisterGuestDto } from './invitation.dto';

export type IssuedInvitation = {
  guest: { id: string; fullName: string; phoneNumber: string };
  invitation: { id: string; qrFileName: string };
  qrDownloadUrl: string;
};

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
  ) {}
  async register(dto: RegisterGuestDto): Promise<IssuedInvitation> {
    const guest = {
      id: randomUUID(),
      fullName: dto.fullName.trim(),
      phoneNumber: normalizeTanzanianPhone(dto.phoneNumber),
    };
    return this.createGuestAndInvitation(guest);
  }
  async issueForExistingGuest(guestId: string): Promise<IssuedInvitation> {
    const [guest] = await this.db
      .select()
      .from(guests)
      .where(eq(guests.id, guestId));
    if (!guest) throw new NotFoundException('Guest not found');
    return this.createGuestAndInvitation(guest, false);
  }
  async reissue(guestId: string, reason: string): Promise<IssuedInvitation> {
    const [current] = await this.db
      .select({ invitation: invitations, checkInId: checkIns.id })
      .from(invitations)
      .leftJoin(checkIns, eq(checkIns.invitationId, invitations.id))
      .where(
        and(eq(invitations.guestId, guestId), eq(invitations.status, 'ACTIVE')),
      );
    if (!current) throw new NotFoundException('Active invitation not found');
    if (current.checkInId)
      throw new BadRequestException(
        'An admitted guest cannot receive a replacement invitation',
      );
    const [guest] = await this.db
      .select()
      .from(guests)
      .where(eq(guests.id, guestId));
    if (!guest) throw new NotFoundException('Guest not found');
    const replacement = await this.createGuestAndInvitation(
      guest,
      false,
      current.invitation.id,
      reason,
    );
    await this.removeQrBestEffort(current.invitation.qrFileName);
    await this.removeCardBestEffort(
      qrFileNameForGuest(guest.fullName, current.invitation.id),
    );
    return replacement;
  }
  async revoke(
    guestId: string,
    reason: string,
  ): Promise<{ status: 'REVOKED' }> {
    const [current] = await this.db
      .select({
        id: invitations.id,
        qrFileName: invitations.qrFileName,
        fullName: guests.fullName,
      })
      .from(invitations)
      .innerJoin(guests, eq(guests.id, invitations.guestId))
      .where(
        and(eq(invitations.guestId, guestId), eq(invitations.status, 'ACTIVE')),
      );
    if (!current) throw new NotFoundException('Active invitation not found');
    await this.db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT 1 FROM invitations WHERE id = ${current.id} FOR UPDATE`,
      );
      const [existingCheckIn] = await tx
        .select({ id: checkIns.id })
        .from(checkIns)
        .where(eq(checkIns.invitationId, current.id));
      if (existingCheckIn)
        throw new BadRequestException(
          'An admitted guest cannot have their invitation revoked',
        );
      const [revoked] = await tx
        .update(invitations)
        .set({
          status: 'REVOKED',
          revocationReason: reason,
          updatedAt: new Date(),
        })
        .where(
          and(eq(invitations.id, current.id), eq(invitations.status, 'ACTIVE')),
        )
        .returning({ id: invitations.id });
      if (!revoked)
        throw new ConflictException('Invitation was already revoked');
    });
    await this.removeQrBestEffort(current.qrFileName);
    await this.removeCardBestEffort(
      qrFileNameForGuest(current.fullName, current.id),
    );
    return { status: 'REVOKED' };
  }
  async qrFile(
    invitationId: string,
  ): Promise<{ fileName: string; content: Buffer }> {
    const [invitation] = await this.db
      .select({
        id: invitations.id,
        fullName: guests.fullName,
        storedFileName: invitations.qrFileName,
        status: invitations.status,
      })
      .from(invitations)
      .innerJoin(guests, eq(guests.id, invitations.guestId))
      .where(eq(invitations.id, invitationId));
    if (!invitation || invitation.status !== 'ACTIVE')
      throw new NotFoundException('Active invitation not found');
    return {
      fileName: qrFileNameForGuest(invitation.fullName, invitation.id),
      content: await readFile(this.storage.qrPath(invitation.storedFileName)),
    };
  }
  async allQrFiles(): Promise<Array<{ fileName: string; content: Buffer }>> {
    const issued = await this.db
      .select({
        id: invitations.id,
        fullName: guests.fullName,
        storedFileName: invitations.qrFileName,
      })
      .from(invitations)
      .innerJoin(guests, eq(guests.id, invitations.guestId))
      .where(eq(invitations.status, 'ACTIVE'));
    return Promise.all(
      issued.map(async (invitation) => ({
        fileName: qrFileNameForGuest(invitation.fullName, invitation.id),
        content: await readFile(this.storage.qrPath(invitation.storedFileName)),
      })),
    );
  }
  async cardFile(
    invitationId: string,
  ): Promise<{ fileName: string; content: Buffer }> {
    const [invitation] = await this.db
      .select({
        id: invitations.id,
        fullName: guests.fullName,
        storedFileName: invitations.qrFileName,
        status: invitations.status,
      })
      .from(invitations)
      .innerJoin(guests, eq(guests.id, invitations.guestId))
      .where(eq(invitations.id, invitationId));
    if (!invitation || invitation.status !== 'ACTIVE')
      throw new NotFoundException('Active invitation not found');

    const fileName = qrFileNameForGuest(invitation.fullName, invitation.id);
    const [templatePng, qrPng] = await Promise.all([
      readFile(this.storage.templatePath('card_template.png')),
      readFile(this.storage.qrPath(invitation.storedFileName)),
    ]);
    const content = await makeCard(invitation.fullName, templatePng, qrPng);
    await writeFile(this.storage.invitationCardPath(fileName), content);
    return { fileName, content };
  }
  private async createGuestAndInvitation(
    guest: { id: string; fullName: string; phoneNumber: string },
    createGuest = true,
    revokeInvitationId?: string,
    revokeReason?: string,
  ): Promise<IssuedInvitation> {
    const invitationId = randomUUID();
    const token = randomBytes(32).toString('base64url');
    const tokenHash = this.hashToken(token);
    const qrFileName = qrFileNameForGuest(guest.fullName, invitationId);
    const checkInUrl = new URL(this.config.getOrThrow<string>('QR_BASE_URL'));
    checkInUrl.searchParams.set('token', token);
    try {
      const png = await QRCode.toBuffer(checkInUrl.toString(), {
        type: 'png',
        width: 900,
        margin: 4,
        errorCorrectionLevel: 'M',
        color: { dark: '#000000', light: '#FFFFFFFF' },
      });
      await writeFile(this.storage.qrPath(qrFileName), png, { flag: 'wx' });
      await this.db.transaction(async (tx) => {
        if (createGuest) await tx.insert(guests).values(guest);
        if (revokeInvitationId) {
          await tx.execute(
            sql`SELECT 1 FROM invitations WHERE id = ${revokeInvitationId} FOR UPDATE`,
          );
          const [existingCheckIn] = await tx
            .select({ id: checkIns.id })
            .from(checkIns)
            .where(eq(checkIns.invitationId, revokeInvitationId));
          if (existingCheckIn)
            throw new BadRequestException(
              'An admitted guest cannot receive a replacement invitation',
            );
          const revoked = await tx
            .update(invitations)
            .set({
              status: 'REVOKED',
              revocationReason: revokeReason,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(invitations.id, revokeInvitationId),
                eq(invitations.status, 'ACTIVE'),
              ),
            )
            .returning({ id: invitations.id });
          if (!revoked.length)
            throw new ConflictException('Invitation was already replaced');
        }
        await tx.insert(invitations).values({
          id: invitationId,
          guestId: guest.id,
          tokenHash,
          qrFileName,
          status: 'ACTIVE',
        });
      });
    } catch (error: unknown) {
      await this.removeQrBestEffort(qrFileName);
      if (isPostgresUniqueViolation(error))
        throw new ConflictException(
          createGuest
            ? 'A guest with this phone number already exists. Use the existing guest ID to retrieve or issue their invitation.'
            : 'Guest already has an active invitation',
        );
      throw error;
    }
    return {
      guest,
      invitation: { id: invitationId, qrFileName },
      qrDownloadUrl: `/api/invitations/${invitationId}/qr`,
    };
  }
  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
  private async removeQrBestEffort(fileName: string): Promise<void> {
    try {
      await this.storage.removeQr(fileName);
    } catch (error: unknown) {
      this.logger.error(
        `Could not remove QR file ${fileName}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
  private async removeCardBestEffort(fileName: string): Promise<void> {
    try {
      await this.storage.removeInvitationCard(fileName);
    } catch (error: unknown) {
      this.logger.error(
        `Could not remove invitation card ${fileName}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
