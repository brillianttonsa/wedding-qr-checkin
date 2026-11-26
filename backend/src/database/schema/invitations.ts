import { index, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { guests } from './guests';
import { invitationStatusEnum } from './enums';

export const invitations = pgTable('invitations', {
  id: uuid('id').defaultRandom().primaryKey(),
  guestId: uuid('guest_id').notNull().unique().references(() => guests.id, { onDelete: 'restrict' }),
  tokenHash: varchar('token_hash', { length: 64 }).notNull(),
  status: invitationStatusEnum('status').notNull().default('ACTIVE'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex('invitations_token_hash_uq').on(table.tokenHash), index('invitations_status_idx').on(table.status)]);
