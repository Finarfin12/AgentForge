import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { users } from '../database/schema';
import { eq, desc } from 'drizzle-orm';

@Injectable()
export class UsersService {
  constructor(private db: DatabaseService) {}

  async findAll() {
    return this.db.drizzle
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        displayName: users.displayName,
        role: users.role,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));
  }

  async findById(id: string) {
    const [user] = await this.db.drizzle
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        displayName: users.displayName,
        role: users.role,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async findByEmail(email: string) {
    const [user] = await this.db.drizzle
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return user ?? null;
  }

  async updateProfile(id: string, data: { displayName?: string }) {
    const [updated] = await this.db.drizzle
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    if (!updated) throw new NotFoundException(`User ${id} not found`);
    return updated;
  }

  async update(id: string, data: { role?: string; displayName?: string }) {
    const [updated] = await this.db.drizzle
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        email: users.email,
        username: users.username,
        displayName: users.displayName,
        role: users.role,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });
    if (!updated) throw new NotFoundException(`User ${id} not found`);
    return updated;
  }

  async remove(id: string) {
    const [deleted] = await this.db.drizzle
      .delete(users)
      .where(eq(users.id, id))
      .returning({ id: users.id });
    if (!deleted) throw new NotFoundException(`User ${id} not found`);
    return { deleted: id };
  }
}
