export const UserRole = { ADMIN: 'ADMIN', GUARD: 'GUARD' } as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];
