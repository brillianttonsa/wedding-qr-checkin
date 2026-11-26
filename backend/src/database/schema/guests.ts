import { pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const guests = pgTable('guests', {
  id: uuid('id').defaultRandom().primaryKey(),
  fullName: varchar('full_name', { length: 160 }).notNull(),
  phoneNumber: varchar('phone_number', { length: 16 }).notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
