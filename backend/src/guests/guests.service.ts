import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { DATABASE, type Database } from '../database/database.module';
import { checkIns, guests, invitations } from '../database/schema';
import { isPostgresUniqueViolation } from '../common/postgres-error';
import { normalizeTanzanianPhone } from '../common/phone';
import { CreateGuestDto, GuestQueryDto, UpdateGuestDto } from './guest.dto';

@Injectable()
export class GuestsService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}
  async create(dto: CreateGuestDto) {
    try {
      const [guest] = await this.db
        .insert(guests)
        .values({
          fullName: dto.fullName.trim(),
          phoneNumber: normalizeTanzanianPhone(dto.phoneNumber),
        })
        .returning();
      return guest;
    } catch (error: unknown) {
      if (isPostgresUniqueViolation(error))
        throw new ConflictException(
          'A guest with this phone number already exists',
        );
      throw error;
    }
  }
  async list(query: GuestQueryDto) {
    const filters = query.search
      ? [
          sql`(${guests.fullName} ILIKE ${`%${query.search}%`} OR ${guests.phoneNumber} ILIKE ${`%${query.search}%`})`,
        ]
      : [];
    if (query.status === 'revoked')
      filters.push(eq(invitations.status, 'REVOKED'));
    if (query.status === 'checked-in')
      filters.push(sql`${checkIns.id} IS NOT NULL`);
    if (query.status === 'not-checked-in')
      filters.push(sql`${checkIns.id} IS NULL`);
    const rows = await this.db
      .select({
        id: guests.id,
        fullName: guests.fullName,
        phoneNumber: guests.phoneNumber,
        createdAt: guests.createdAt,
        invitationId: invitations.id,
        invitationStatus: invitations.status,
        checkedInAt: checkIns.checkedInAt,
      })
      .from(guests)
      .leftJoin(
        invitations,
        sql`${invitations.id} = (
          SELECT latest.id
          FROM invitations AS latest
          WHERE latest.guest_id = ${guests.id}
          ORDER BY latest.created_at DESC, latest.id DESC
          LIMIT 1
        )`,
      )
      .leftJoin(checkIns, eq(checkIns.invitationId, invitations.id))
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(guests.fullName);
    return rows.map((guest) => ({
      ...guest,
      qrDownloadUrl:
        guest.invitationId && guest.invitationStatus === 'ACTIVE'
          ? `/api/invitations/${guest.invitationId}/qr`
          : null,
    }));
  }
  async update(id: string, dto: UpdateGuestDto) {
    try {
      const [guest] = await this.db
        .update(guests)
        .set({
          fullName: dto.fullName.trim(),
          phoneNumber: normalizeTanzanianPhone(dto.phoneNumber),
          updatedAt: new Date(),
        })
        .where(eq(guests.id, id))
        .returning();
      if (!guest) throw new NotFoundException('Guest not found');
      return guest;
    } catch (error: unknown) {
      if (isPostgresUniqueViolation(error))
        throw new ConflictException(
          'A guest with this phone number already exists',
        );
      throw error;
    }
  }
  async find(id: string) {
    const [guest] = await this.db
      .select()
      .from(guests)
      .where(eq(guests.id, id));
    if (!guest) throw new NotFoundException('Guest not found');
    return guest;
  }
}
