# Example 3: Automated Code Review Pipeline

In this example, we'll create a complete pipeline that:
1. Detects code changes
2. Analyzes complexity
3. Routes to appropriate reviewers
4. Aggregates results
5. Posts comments to GitHub

## Pipeline Flow

```
GitHub Push Event
       ↓
   [Analyze Code]  ← Determine complexity
       ↓
   [Decision Point]
       ├─→ Simple? → [Quick Review]
       └─→ Complex? → [Full Review Squad]
       ↓
   [Aggregate Results]
       ↓
   [Post to GitHub]
```

## Setup

### Step 1: Define Pipeline

```yaml
# pipeline.yml
name: Code Review Pipeline
trigger: on-push
description: Automated code review for GitHub pushes

stages:
  - name: analyze
    description: Analyze code complexity
    agent: analyzer
    config:
      model: gpt-3.5-turbo
      timeout_ms: 10000
    
  - name: decide_complexity
    description: Determine if complex review needed
    condition: "{{ steps.analyze.complexity_score > 7 }}"
    
  - name: full_review
    if_true: "{{ steps.decide_complexity }}"
    description: Deep review for complex code
    squad: enterprise-review-squad
    config:
      timeout_ms: 30000
      
  - name: quick_review
    if_false: "{{ steps.decide_complexity }}"
    description: Quick review for simple code
    agent: quick-reviewer
    config:
      model: gpt-3.5-turbo
      
  - name: aggregate
    description: Combine all reviews
    handler: aggregate_reviews
    
  - name: post_to_github
    description: Post results as PR comment
    handler: post_github_comment
    config:
      template: standard_review
```

### Step 2: Create Pipeline via API

```bash
curl -X POST http://localhost:3002/pipelines \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Code Review Pipeline",
    "description": "Automated code review on GitHub push",
    "trigger_type": "webhook",
    "trigger_url": "github",
    "stages": [
      {
        "name": "analyze",
        "agent_id": "analyzer",
        "handler": "analyze_code_complexity"
      },
      {
        "name": "conditional_review",
        "type": "conditional",
        "condition": "complexity > 7",
        "if_true_stage": "full_review",
        "if_false_stage": "quick_review"
      },
      {
        "name": "full_review",
        "squad_id": "enterprise-review-squad"
      },
      {
        "name": "quick_review",
        "agent_id": "quick-reviewer"
      },
      {
        "name": "post_github_comment",
        "handler": "post_pr_comment"
      }
    ]
  }'
```

### Step 3: Setup GitHub Webhook

1. Go to your GitHub repo → **Settings → Webhooks**
2. Click **Add webhook**
3. Set URL to: `https://your-agentforge-domain/webhooks/github`
4. Select events: `Push events`, `Pull request events`
5. Content type: `application/json`
6. Secret: (generate and store securely)

### Step 4: Configure Pipeline Handler

Create a custom handler in `backend/src/handlers/github-review.handler.ts`:

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class GitHubReviewHandler {
  
  async analyzeCodeComplexity(files: GitFile[]): Promise<AnalysisResult> {
    // Analyze each file for complexity metrics
    const complexities = files.map(f => this.calculateComplexity(f.content));
    return {
      complexity_score: Math.max(...complexities),
      files_analyzed: files.length,
      high_complexity_files: complexities.filter(c => c > 8)
    };
  }
  
  async aggregateReviews(reviews: any[]): Promise<AggregatedReview> {
    return {
      total_issues: reviews.reduce((sum, r) => sum + r.issues.length, 0),
      critical_issues: reviews
        .flatMap(r => r.issues)
        .filter(i => i.severity === 'critical'),
      average_score: reviews.reduce((sum, r) => sum + r.score, 0) / reviews.length,
      recommendations: this.deduplicateRecommendations(reviews)
    };
  }
  
  async postGitHubComment(event: GithubEvent, result: AggregatedReview) {
    const comment = this.formatComment(result);
    
    await github.createPullRequestComment({
      owner: event.repository.owner,
      repo: event.repository.name,
      pull_number: event.pull_request.number,
      body: comment
    });
  }
  
  private formatComment(result: AggregatedReview): string {
    return `
## 🤖 Automated Code Review

**Overall Score:** ${result.average_score}/10

### Issues Found
- **Critical:** ${result.critical_issues.length}
- **Total:** ${result.total_issues}

### Recommendations
${result.recommendations.map(r => `- ${r}`).join('\n')}

---
*Reviewed by AgentForge*
    `.trim();
  }
}
```

## Execution

When someone pushes to your repository:

1. **GitHub sends webhook** → AgentForge receives event
2. **Analyze stage** → Complexity score calculated (~3s)
3. **Conditional** → Decides review path
4. **Full/Quick review** → Appropriate review runs (~5-10s)
5. **Aggregate** → Results combined
6. **Post comment** → GitHub PR gets comment

## Example GitHub Comment Output

```
🤖 Automated Code Review

Overall Score: 7.2/10

### Issues Found
- Critical: 2
- Total: 8

### Issues

#### Critical Issues
❌ SQL injection vulnerability in `database.ts:42`
```sql
const query = `SELECT * FROM users WHERE id = ${userId}`;
```
Recommendation: Use parameterized queries

❌ Unhandled promise rejection in `api.ts:15`
```typescript
fetch('/api/data').then(r => r.json());
```
Recommendation: Add .catch() handler

#### High Priority Issues
⚠️ N+1 query problem in `service.ts:78`
Recommendation: Implement batch loading

⚠️ Missing input validation in `controller.ts:22`
Recommendation: Add validation middleware

### Recommendations
- Implement parameterized queries library (e.g., Prisma)
- Add error handling middleware
- Set up request validation with class-validator
- Implement caching strategy for frequent queries

---
*Reviewed by AgentForge with GPT-4*
```

## Advanced Features

### Approval Gates

Require manual approval for high-severity issues:

```yaml
stages:
  - name: check_critical_issues
    condition: "{{ aggregate.critical_issues > 0 }}"
    action: request_review
    reviewers: [team-leads]
```

### Custom Metrics

Track review metrics over time:

```typescript
// Track in database
await metrics.record({
  pipeline: 'code-review',
  stage: 'analyze',
  duration_ms: 3000,
  score: 7.2,
  issues_found: 8,
  timestamp: new Date()
});
```

### Parallel Stages

Run independent stages in parallel:

```yaml
stages:
  - name: parallel_reviews
    parallel: true
    stages:
      - full_review_squad
      - lint_check
      - dependency_analysis
```

## Cost Analysis

Per push:
- Analyze: $0.001 (GPT-3.5)
- Full Review: $0.061 (3 × GPT-4 + GPT-3.5)
- **Total: $0.062**

With 50 pushes/day: **$3.10/day** or **$93/month**

## Optimization Tips

1. **Cache analyses** — Don't re-analyze unchanged files
2. **Batch similar reviews** — Group similar code patterns
3. **Use cheaper models for preprocessing** — Save GPT-4 for complex analysis
4. **Set timeouts** — Don't wait forever for slow agents
5. **Implement backoff** — Retry with longer timeouts on failure

## Next Steps

- [Deploy to Production](../deployment.md)
- [Create Custom Skills](../skill-development.md)
- [Monitor Performance](../monitoring.md)
- [Scale to Multiple Repos](../scaling.md)

## Troubleshooting

### Pipeline not triggering?
```bash
# Check webhook delivery
curl -X POST http://localhost:3002/webhooks/github \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: push" \
  -d '{...}'
```

### Reviews not posting to GitHub?
- Check GitHub token permissions
- Verify repo access
- Check webhook delivery logs

### High API costs?
- Reduce model complexity for analyze stage
- Implement caching
- Skip architecture review for simple changes

