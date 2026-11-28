import {
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { guests } from './guests';
import { invitationStatusEnum } from './enums';

export const invitations = pgTable(
  'invitations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    guestId: uuid('guest_id')
      .notNull()
      .references(() => guests.id, { onDelete: 'restrict' }),
    tokenHash: varchar('token_hash', { length: 64 }).notNull(),
    qrFileName: varchar('qr_file_name', { length: 255 }).notNull(),
    revocationReason: varchar('revocation_reason', { length: 200 }),
    status: invitationStatusEnum('status').notNull().default('ACTIVE'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('invitations_token_hash_uq').on(table.tokenHash),
    uniqueIndex('invitations_qr_file_name_uq').on(table.qrFileName),
    uniqueIndex('invitations_one_active_per_guest_uq')
      .on(table.guestId)
      .where(sql`${table.status} = 'ACTIVE'`),
    index('invitations_status_idx').on(table.status),
  ],
);
