import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { settings, users } from '../database/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class SettingsService {
  constructor(private db: DatabaseService) {}

  async getAll() {
    return this.db.drizzle.select().from(settings).orderBy(settings.key);
  }

  async getByCategory(category: string) {
    return this.db.drizzle.select().from(settings).where(eq(settings.category, category));
  }

  async getKey(key: string) {
    const [row] = await this.db.drizzle.select().from(settings).where(eq(settings.key, key)).limit(1);
    if (!row) throw new NotFoundException(`Setting "${key}" not found`);
    return row;
  }

  async setKey(key: string, data: { value: any; category?: string; description?: string }) {
    const existing = await this.db.drizzle.select().from(settings).where(eq(settings.key, key)).limit(1);
    if (existing.length > 0) {
      const [updated] = await this.db.drizzle
        .update(settings)
        .set({ value: data.value, category: data.category, description: data.description, updatedAt: new Date() })
        .where(eq(settings.key, key))
        .returning();
      return updated;
    }
    const [created] = await this.db.drizzle
      .insert(settings)
      .values({ key, value: data.value, category: data.category || 'general', description: data.description || '' })
      .returning();
    return created;
  }

  async getProfile(userId: string) {
    const [user] = await this.db.drizzle.select({ preferences: users.preferences }).from(users).where(eq(users.id, userId)).limit(1);
    return user?.preferences || {};
  }

  async updateProfile(userId: string, preferences: Record<string, any>) {
    const [updated] = await this.db.drizzle
      .update(users)
      .set({ preferences })
      .where(eq(users.id, userId))
      .returning({ preferences: users.preferences });
    return updated.preferences || {};
  }
}
