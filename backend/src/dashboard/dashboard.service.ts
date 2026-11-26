import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DATABASE, type Database } from '../database/database.module';
import { checkIns, guests, invitations } from '../database/schema';

@Injectable()
export class DashboardService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}
  async statistics(): Promise<{ totalGuests: number; admitted: number; notAdmitted: number; revoked: number }> {
    const [row] = await this.db.select({ totalGuests: sql<number>`count(distinct ${guests.id})::int`, admitted: sql<number>`count(distinct ${checkIns.id})::int`, revoked: sql<number>`count(distinct case when ${invitations.status} = 'REVOKED' then ${invitations.id} end)::int` })
      .from(guests).leftJoin(invitations, eq(invitations.guestId, guests.id)).leftJoin(checkIns, eq(checkIns.invitationId, invitations.id));
    return { totalGuests: row.totalGuests, admitted: row.admitted, notAdmitted: row.totalGuests - row.admitted, revoked: row.revoked };
  }
}
