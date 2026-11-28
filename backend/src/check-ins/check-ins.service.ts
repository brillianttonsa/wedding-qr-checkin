import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DATABASE, type Database } from '../database/database.module';
import { checkIns, guests, invitations } from '../database/schema';
import { InvitationsService } from '../invitations/invitations.service';
import { isPostgresUniqueViolation } from '../common/postgres-error';

export type Verification =
  | { status: 'VALID'; invitationId: string; guestName: string }
  | { status: 'INVALID' | 'REVOKED' | 'ALREADY_USED' };

@Injectable()
export class CheckInsService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly invitationService: InvitationsService,
  ) {}
  async verify(token: string): Promise<Verification> {
    const tokenHash = this.invitationService.hashToken(token);
    const [record] = await this.db
      .select({
        invitationId: invitations.id,
        status: invitations.status,
        guestName: guests.fullName,
        checkInId: checkIns.id,
      })
      .from(invitations)
      .innerJoin(guests, eq(guests.id, invitations.guestId))
      .leftJoin(checkIns, eq(checkIns.invitationId, invitations.id))
      .where(eq(invitations.tokenHash, tokenHash));
    if (!record) return { status: 'INVALID' };
    if (record.status === 'REVOKED') return { status: 'REVOKED' };
    if (record.checkInId) return { status: 'ALREADY_USED' };
    return {
      status: 'VALID',
      invitationId: record.invitationId,
      guestName: record.guestName,
    };
  }
  async confirm(
    token: string,
    guardId: string,
    idempotencyKey: string,
  ): Promise<
    | { status: 'CONFIRMED'; guestName: string; checkedInAt: Date }
    | { status: 'INVALID' | 'REVOKED' | 'ALREADY_USED' }
  > {
    const tokenHash = this.invitationService.hashToken(token);
    try {
      return await this.db.transaction(async (tx) => {
        const [invitation] = await tx
          .select({
            id: invitations.id,
            status: invitations.status,
            guestName: guests.fullName,
          })
          .from(invitations)
          .innerJoin(guests, eq(guests.id, invitations.guestId))
          .where(eq(invitations.tokenHash, tokenHash));
        if (!invitation) return { status: 'INVALID' as const };
        await tx.execute(
          sql`SELECT 1 FROM invitations WHERE id = ${invitation.id} FOR UPDATE`,
        );
        const [lockedInvitation] = await tx
          .select({ status: invitations.status })
          .from(invitations)
          .where(eq(invitations.id, invitation.id));
        if (lockedInvitation?.status === 'REVOKED')
          return { status: 'REVOKED' as const };
        const [sameRequest] = await tx
          .select()
          .from(checkIns)
          .where(eq(checkIns.idempotencyKey, idempotencyKey));
        if (sameRequest) {
          if (sameRequest.invitationId !== invitation.id)
            throw new ConflictException(
              'Idempotency key was used for another invitation',
            );
          return {
            status: 'CONFIRMED' as const,
            guestName: invitation.guestName,
            checkedInAt: sameRequest.checkedInAt,
          };
        }
        const [existing] = await tx
          .select({ id: checkIns.id })
          .from(checkIns)
          .where(eq(checkIns.invitationId, invitation.id));
        if (existing) return { status: 'ALREADY_USED' as const };
        const [checkIn] = await tx
          .insert(checkIns)
          .values({ invitationId: invitation.id, guardId, idempotencyKey })
          .returning();
        return {
          status: 'CONFIRMED' as const,
          guestName: invitation.guestName,
          checkedInAt: checkIn.checkedInAt,
        };
      });
    } catch (error: unknown) {
      if (isPostgresUniqueViolation(error)) {
        throw new ConflictException(
          'Invitation or idempotency key was already used',
        );
      }
      throw error;
    }
  }
}
