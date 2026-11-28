import 'dotenv/config';
import * as argon2 from 'argon2';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { users } from './schema/users';

const accountSpecs = [
  {
    fullName: 'Wedding Administrator',
    username: 'admin',
    role: 'ADMIN' as const,
    password: process.env.SEED_ADMIN_PASSWORD,
  },
  {
    fullName: 'Security Guard 1',
    username: 'guard1',
    role: 'GUARD' as const,
    password: process.env.SEED_GUARD_1_PASSWORD,
  },
  {
    fullName: 'Security Guard 2',
    username: 'guard2',
    role: 'GUARD' as const,
    password: process.env.SEED_GUARD_2_PASSWORD,
  },
];

async function seed(): Promise<void> {
  if (!process.env.POSTGRES_URL) throw new Error('POSTGRES_URL is required');
  if (accountSpecs.some((account) => !account.password))
    throw new Error('All SEED_*_PASSWORD variables are required');
  if (
    accountSpecs.some(
      (account) => account.password && account.password.length < 12,
    )
  )
    throw new Error('Seed passwords must be at least 12 characters');
  const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
  try {
    const db = drizzle(pool);
    for (const account of accountSpecs) {
      const password = account.password;
      if (!password)
        throw new Error(`Missing seed password for ${account.username}`);
      const passwordHash = await argon2.hash(password);
      await db
        .insert(users)
        .values({
          fullName: account.fullName,
          username: account.username,
          role: account.role,
          passwordHash,
        })
        .onConflictDoNothing({ target: users.username });
    }
  } finally {
    await pool.end();
  }
}
void seed().catch((error: unknown) => {
  console.error('Database seed failed', error);
  process.exitCode = 1;
});
