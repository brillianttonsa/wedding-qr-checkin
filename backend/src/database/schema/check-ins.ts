import { pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { invitations } from './invitations';
import { users } from './users';

export const checkIns = pgTable('check_ins', {
  id: uuid('id').defaultRandom().primaryKey(),
  invitationId: uuid('invitation_id').notNull().references(() => invitations.id, { onDelete: 'restrict' }),
  guardId: uuid('guard_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  checkedInAt: timestamp('checked_in_at', { withTimezone: true }).notNull().defaultNow(),
  idempotencyKey: varchar('idempotency_key', { length: 128 }).notNull(),
}, (table) => [
  uniqueIndex('check_ins_invitation_id_uq').on(table.invitationId),
  uniqueIndex('check_ins_idempotency_key_uq').on(table.idempotencyKey),
]);
