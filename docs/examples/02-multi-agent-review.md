# Example 2: Multi-Agent Code Review Squad

In this example, we'll create a squad with multiple specialized agents reviewing code from different angles.

## Architecture

```
┌─────────────────────────────────────┐
│      Code Review Squad              │
├─────────────────────────────────────┤
│  • Architecture Reviewer (GPT-4)    │
│  • Performance Reviewer (GPT-3.5)   │
│  • Security Reviewer (GPT-4)        │
└──────────┬──────────────────────────┘
           │
           ├─→ Reviews for design patterns
           ├─→ Reviews for performance issues
           └─→ Reviews for security vulnerabilities
```

## Setup

### Step 1: Register Multiple Agents

**Agent 1: Architecture Specialist**
```bash
# Terminal 1
cd agents
AGENT_NAME=architect \
AGENT_PROVIDER=openai \
AGENT_MODEL=gpt-4 \
OPENAI_API_KEY=sk-... \
npm start
```

**Agent 2: Performance Specialist**
```bash
# Terminal 2
AGENT_NAME=performance-expert \
AGENT_PROVIDER=openai \
AGENT_MODEL=gpt-3.5-turbo \
OPENAI_API_KEY=sk-... \
npm start
```

**Agent 3: Security Specialist**
```bash
# Terminal 3
AGENT_NAME=security-expert \
AGENT_PROVIDER=openai \
AGENT_MODEL=gpt-4 \
OPENAI_API_KEY=sk-... \
npm start
```

### Step 2: Create Squad

```bash
curl -X POST http://localhost:3002/squads \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Enterprise Code Review Squad",
    "description": "Multi-perspective code review with architects, performance experts, and security specialists",
    "agent_ids": [
      "agent-id-architect",
      "agent-id-performance",
      "agent-id-security"
    ],
    "mode": "parallel",
    "settings": {
      "timeout_ms": 30000,
      "aggregate_results": true
    }
  }'
```

### Step 3: Submit Task

```bash
curl -X POST http://localhost:3002/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "squad_id": "squad-enterprise-review",
    "prompt": "You are a [ROLE] expert. Review this code from a [PERSPECTIVE] perspective.",
    "context": {
      "code": "
async function fetchUserData(userId: string) {
  const response = await fetch(\`/api/users/\${userId}\`);
  const data = await response.json();
  return data;
}

app.get(\"/user/:id\", async (req, res) => {
  const userData = await fetchUserData(req.params.id);
  res.json(userData);
});
      ",
      "language": "typescript",
      "roles": [
        {
          "name": "architect",
          "perspective": "architecture and design patterns"
        },
        {
          "name": "performance-expert",
          "perspective": "performance and optimization"
        },
        {
          "name": "security-expert",
          "perspective": "security vulnerabilities"
        }
      ]
    }
  }'
```

## Response Example

```json
{
  "id": "task-multi-456",
  "squad_id": "squad-enterprise-review",
  "status": "completed",
  "reviews": [
    {
      "agent_name": "architect",
      "review": {
        "design_patterns": [
          "Missing dependency injection",
          "Consider using async/await wrapper"
        ],
        "suggestions": [
          "Implement repository pattern",
          "Add error handling middleware"
        ]
      }
    },
    {
      "agent_name": "performance-expert",
      "review": {
        "issues": [
          "N+1 query problem - userData might make multiple DB calls",
          "Missing caching strategy"
        ],
        "optimizations": [
          "Implement Redis caching",
          "Add rate limiting"
        ]
      }
    },
    {
      "agent_name": "security-expert",
      "review": {
        "vulnerabilities": [
          "SQL injection risk if userId not validated",
          "Missing input validation on req.params.id"
        ],
        "recommendations": [
          "Add input sanitization",
          "Implement authentication middleware"
        ]
      }
    }
  ],
  "aggregate_score": 6.2,
  "overall_rating": "Needs improvement",
  "completed_at": "2024-01-15T11:45:30Z"
}
```

## Key Features

### Parallel Execution
All agents review simultaneously (faster than sequential):
- **Architect**: ~5s
- **Performance Expert**: ~4s
- **Security Expert**: ~6s
- **Total**: ~6s (not 15s)

### Aggregation
Results are combined intelligently:
- Duplicates removed
- Severity levels merged
- Confidence scores calculated

### Scoring
Each agent provides a score, final score is averaged:
- Architect: 7/10
- Performance: 5/10
- Security: 6/10
- **Average: 6/10**

## Advanced: Conditional Review

Some agents only review if specific conditions are met:

```bash
curl -X POST http://localhost:3002/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "squad_id": "squad-enterprise-review",
    "prompt": "Review this code",
    "context": {
      "code": "...",
      "review_options": {
        "security": true,        # Always run security
        "performance": true,     # Always run performance
        "architecture": false    # Skip architecture this time
      }
    }
  }'
```

## Cost Analysis

Using OpenAI API:

| Agent | Model | Cost per Task |
|-------|-------|--------------|
| Architect | GPT-4 | $0.03 |
| Performance | GPT-3.5 | $0.001 |
| Security | GPT-4 | $0.03 |
| **Total** | - | **$0.061** |

vs. Sequential: $0.061 × 3 intervals = $0.183 (if we waited for each response)

## Next Steps

1. **Add more agents** — Database specialist, Frontend specialist, etc.
2. **Create skills** — Reuse review logic in other projects
3. **Schedule reviews** — Run automatically on PRs
4. **Monitor quality** — Track consistency across reviews
5. [Example 3: Automated Pipeline](03-pipeline-example.md)

## Tips

- **Use different models strategically** — GPT-4 for complex tasks, GPT-3.5 for simpler ones
- **Aggregate thoughtfully** — Weight scores by agent expertise
- **Cache responses** — Store similar reviews for faster retrieval
- **Monitor costs** — Track spending per agent and optimize
