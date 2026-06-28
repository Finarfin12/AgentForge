import { Injectable, Logger } from '@nestjs/common';
import { SkillsService } from '../skills/skills.service';
import { DatabaseService } from '../database/database.service';
import { settings } from '../database/schema';
import { eq } from 'drizzle-orm';

export interface MarketplaceItem {
  id: string;
  name: string;
  fullName: string;
  description: string;
  stars: number;
  language: string | null;
  topics: string[];
  updatedAt: string;
  cloneUrl: string;
  hasSkillMd: boolean;
}

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
  topics: string[];
  updated_at: string;
  clone_url: string;
  html_url: string;
}

@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);

  constructor(
    private skillsService: SkillsService,
    private db: DatabaseService,
  ) {}

  async search(query: string, page = 1): Promise<MarketplaceItem[]> {
    const token = await this.getGithubToken();
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'AgentForge',
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    // Search repos tagged with "skill" topic + optional keyword
    const queryParam = query ? `topic:skill ${query}` : 'topic:skill';
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(queryParam)}&sort=stars&order=desc&per_page=30&page=${page}`;

    const res = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      this.logger.warn(`GitHub repo search failed: ${res.status}`);
      const text = await res.text().catch(() => '');
      this.logger.warn(text.substring(0, 200));
      return [];
    }

    const data = (await res.json()) as { items: GitHubRepo[] };
    const repos = data.items || [];

    // Batch-check SKILL.md in parallel
    const checks = repos.map((repo) =>
      this.checkHasSkillMd(repo.full_name, headers).then((has) => ({ repo, has })),
    );
    const results = await Promise.all(checks);

    return results
      .filter((r) => r.has)
      .map(({ repo }) => ({
        id: String(repo.id),
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description || '',
        stars: repo.stargazers_count,
        language: repo.language,
        topics: repo.topics || [],
        updatedAt: repo.updated_at,
        cloneUrl: repo.clone_url,
        hasSkillMd: true,
      }));
  }

  private async getGithubToken(): Promise<string | null> {
    try {
      const [row] = await this.db.drizzle
        .select()
        .from(settings)
        .where(eq(settings.key, 'github_token'))
        .limit(1);
      return (row?.value as string) || null;
    } catch {
      return null;
    }
  }

  private async checkHasSkillMd(fullName: string, headers: Record<string, string>): Promise<boolean> {
    try {
      const res = await fetch(`https://api.github.com/repos/${fullName}/contents/SKILL.md`, {
        headers,
        signal: AbortSignal.timeout(3000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async import(fullName: string): Promise<any> {
    const token = await this.getGithubToken();
    const headers: Record<string, string> = { 'User-Agent': 'AgentForge' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const [owner, repo] = fullName.split('/');
    if (!owner || !repo) throw new Error('Invalid repo format: owner/repo');

    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/SKILL.md`, {
      headers: { ...headers, Accept: 'application/vnd.github.v3.raw' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`Failed to fetch SKILL.md: ${res.status}`);

    const content = await res.text();

    const repoInfoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: { ...headers, Accept: 'application/vnd.github.v3+json' },
      signal: AbortSignal.timeout(5000),
    });
    const repoInfo = repoInfoRes.ok ? ((await repoInfoRes.json()) as GitHubRepo) : null;

    const skill = await this.skillsService.create({
      name: repo,
      description: repoInfo?.description || `Imported from github.com/${fullName}`,
      content,
      origin: 'marketplace',
      config: { source: fullName, cloneUrl: repoInfo?.clone_url, stars: repoInfo?.stargazers_count },
    });

    return skill;
  }
}
