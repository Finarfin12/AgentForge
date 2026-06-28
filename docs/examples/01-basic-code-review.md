# Example 1: Basic Code Review with Single Agent

In this example, we'll create a simple code review task using a single AI agent.

## Prerequisites

- AgentForge running (see [Getting Started](../ai-developer-guide.md))
- At least one agent registered (Ollama, OpenAI, or local)

## Step 1: Create a Squad

**Via API:**

```bash
curl -X POST http://localhost:3002/squads \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Code Reviewer",
    "description": "Reviews code for quality and best practices",
    "agent_ids": ["your-agent-id"],
    "settings": {
      "temperature": 0.7,
      "max_tokens": 2000
    }
  }'
```

## Step 2: Submit a Code Review Task

```bash
curl -X POST http://localhost:3002/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "squad_id": "your-squad-id",
    "prompt": "Review the following TypeScript code. Identify any bugs, performance issues, or best practice violations.",
    "context": {
      "code": "function calculateSum(arr: number[]): number {\n  let sum = 0;\n  for (let i = 0; i < arr.length; i++) {\n    sum += arr[i];\n  }\n  return sum;\n}\n\nconst numbers = [1, 2, 3, 4, 5];\nconst result = calculateSum(numbers);\nconsole.log(result);",
      "language": "typescript",
      "filename": "math.ts"
    }
  }'
```

## Response Example

```json
{
  "id": "task-123",
  "squad_id": "squad-456",
  "status": "completed",
  "result": {
    "review": "The code is functional but could be improved...",
    "issues": [
      {
        "severity": "low",
        "line": 3,
        "message": "Consider using Array.reduce() for a more functional approach"
      }
    ],
    "suggestions": [
      "Use arrow functions for modern TypeScript style",
      "Add JSDoc comments for better documentation"
    ],
    "quality_score": 7.5
  },
  "created_at": "2024-01-15T10:30:00Z",
  "completed_at": "2024-01-15T10:32:15Z"
}
```

## Step 3: Get Task Results

```bash
curl http://localhost:3002/tasks/task-123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## In the UI

1. Navigate to **Tasks**
2. Click **New Task**
3. Select your squad
4. Paste your code
5. Click **Execute**
6. View results in real-time

## Tips

- **Use clear context** — Include language, file type, and any special requirements
- **Adjust temperature** — Lower (0.3-0.5) for consistent reviews, higher (0.8+) for creative suggestions
- **Save templates** — Create task templates for common review types
- **Rate results** — Help improve the model by rating task quality

## Next Examples

- [Example 2: Multi-Agent Code Review](02-multi-agent-review.md)
- [Example 3: Automated Code Review Pipeline](03-pipeline-example.md)
