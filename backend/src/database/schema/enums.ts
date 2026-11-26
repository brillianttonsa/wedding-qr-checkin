import { pgEnum } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['ADMIN', 'GUARD']);
export const invitationStatusEnum = pgEnum('invitation_status', ['ACTIVE', 'REVOKED']);
