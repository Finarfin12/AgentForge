import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { DatabaseService } from '../database/database.service';
import { users } from '../database/schema';
import { eq, or, sql } from 'drizzle-orm';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuditService } from '../logs/audit.service';

@Injectable()
export class AuthService {
  constructor(
    private db: DatabaseService,
    private jwtService: JwtService,
    private auditService: AuditService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.db.drizzle
      .select()
      .from(users)
      .where(or(eq(users.email, dto.email), eq(users.username, dto.username)))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException('Email or username already taken');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const [user] = await this.db.drizzle
      .insert(users)
      .values({
        email: dto.email,
        username: dto.username,
        displayName: dto.displayName ?? dto.username,
        passwordHash,
      })
      .returning({
        id: users.id,
        email: users.email,
        username: users.username,
        displayName: users.displayName,
        role: users.role,
        createdAt: users.createdAt,
      });

    this.auditService.record({ action: `User registered: ${user.username}`, entityType: 'user', entityId: user.id, userId: user.id });

    return { user, token: this.signToken(user) };
  }

  async login(dto: LoginDto) {
    const [user] = await this.db.drizzle
      .select()
      .from(users)
      .where(
        or(eq(users.email, dto.identifier), eq(users.username, dto.identifier)),
      )
      .limit(1);

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    await this.db.drizzle
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    this.auditService.record({ action: `User logged in: ${user.username}`, entityType: 'user', entityId: user.id, userId: user.id });

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
      },
      token: this.signToken(user),
    };
  }

  async forgotPassword(email: string) {
    const [user] = await this.db.drizzle
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      return { message: 'If that email is registered, a reset link has been sent.' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = await bcrypt.hash(resetToken, 10);
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.db.drizzle
      .update(users)
      .set({ resetToken: resetTokenHash, resetTokenExpiry: expiry })
      .where(eq(users.id, user.id));

    // In production: send email with reset token
    // For local dev: log the token
    console.log(`Password reset token for ${email}: ${resetToken}`);

    return { message: 'If that email is registered, a reset link has been sent.' };
  }

  async resetPassword(token: string, newPassword: string) {
    const usersWithTokens = await this.db.drizzle
      .select({ id: users.id, resetToken: users.resetToken, resetTokenExpiry: users.resetTokenExpiry })
      .from(users)
      .where(sql`${users.resetToken} IS NOT NULL AND ${users.resetTokenExpiry} > NOW()`);

    let matched = false;
    for (const u of usersWithTokens) {
      if (u.resetToken) {
        const match = await bcrypt.compare(token, u.resetToken);
        if (match) {
          const passwordHash = await bcrypt.hash(newPassword, 12);
          await this.db.drizzle
            .update(users)
            .set({ passwordHash, resetToken: null, resetTokenExpiry: null, updatedAt: new Date() })
            .where(eq(users.id, u.id));
          matched = true;
          break;
        }
      }
    }

    if (!matched) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    return { message: 'Password reset successful' };
  }

  async me(userId: string) {
    const [user] = await this.db.drizzle
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        role: users.role,
        preferences: users.preferences,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return user;
  }

  private signToken(user: { id: string; email: string; username: string; role: string | null }) {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role ?? 'user',
    });
  }
}
