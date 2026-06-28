import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { agentReviews } from '../database/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

@Injectable()
export class ReviewsService {
  constructor(private db: DatabaseService) {}

  async findByAgent(agentId: string) {
    const rows = await this.db.drizzle
      .select({
        id: agentReviews.id,
        agentId: agentReviews.agentId,
        userId: agentReviews.userId,
        rating: agentReviews.rating,
        title: agentReviews.title,
        review: agentReviews.review,
        createdAt: agentReviews.createdAt,
      })
      .from(agentReviews)
      .where(eq(agentReviews.agentId, agentId))
      .orderBy(desc(agentReviews.createdAt));
    return rows;
  }

  async getStats(agentId: string) {
    const [result] = await this.db.drizzle
      .select({
        avg: sql<number>`COALESCE(AVG(rating), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(agentReviews)
      .where(eq(agentReviews.agentId, agentId));
    return { avgRating: Number(result.avg), totalReviews: Number(result.count) };
  }

  async create(data: { agentId: string; userId: string; rating: number; title?: string; review?: string }) {
    if (data.rating < 1 || data.rating > 5) throw new BadRequestException('Rating must be 1-5');

    const existing = await this.db.drizzle
      .select()
      .from(agentReviews)
      .where(and(eq(agentReviews.agentId, data.agentId), eq(agentReviews.userId, data.userId)))
      .limit(1);

    if (existing.length > 0) throw new BadRequestException('You have already reviewed this agent');

    const [review] = await this.db.drizzle
      .insert(agentReviews)
      .values({
        agentId: data.agentId,
        userId: data.userId,
        rating: data.rating,
        title: data.title,
        review: data.review,
      })
      .returning();
    return review;
  }

  async update(id: string, userId: string, data: { rating?: number; title?: string; review?: string }) {
    const [existing] = await this.db.drizzle.select().from(agentReviews).where(eq(agentReviews.id, id)).limit(1);
    if (!existing) throw new NotFoundException('Review not found');
    if (existing.userId !== userId) throw new BadRequestException('Not your review');

    const [updated] = await this.db.drizzle
      .update(agentReviews)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(agentReviews.id, id))
      .returning();
    return updated;
  }

  async remove(id: string, userId: string) {
    const [existing] = await this.db.drizzle.select().from(agentReviews).where(eq(agentReviews.id, id)).limit(1);
    if (!existing) throw new NotFoundException('Review not found');
    if (existing.userId !== userId) throw new BadRequestException('Not your review');

    await this.db.drizzle.delete(agentReviews).where(eq(agentReviews.id, id));
    return { deleted: true };
  }
}
