import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import { DATABASE, type Database } from '../database/database.module';
import { users } from '../database/schema/users';
import { LoginDto } from './login.dto';
import { AuthenticatedUser } from './jwt.strategy';

@Injectable()
export class AuthService {
  constructor(@Inject(DATABASE) private readonly db: Database, private readonly jwt: JwtService) {}
  async login(dto: LoginDto): Promise<{ accessToken: string; user: AuthenticatedUser }> {
    const [user] = await this.db.select().from(users).where(eq(users.username, dto.username)).limit(1);
    if (!user || !user.isActive || !(await argon2.verify(user.passwordHash, dto.password))) throw new UnauthorizedException('Invalid credentials');
    const principal: AuthenticatedUser = { id: user.id, username: user.username, role: user.role };
    return { accessToken: await this.jwt.signAsync(principal), user: principal };
  }
}
