# AI Developer Guide: Getting Started with AgentForge

Welcome! This guide will help you build sophisticated multi-agent AI systems with AgentForge.

## Table of Contents

1. [What is AgentForge?](#what-is-agentforge)
2. [Why AgentForge?](#why-agentforge)
3. [Core Concepts](#core-concepts)
4. [Your First Multi-Agent System](#your-first-multi-agent-system)
5. [Working with Skills](#working-with-skills)
6. [Advanced Patterns](#advanced-patterns)

---

## What is AgentForge?

AgentForge is a **multi-agent orchestration platform** that lets you:

- 🤖 **Coordinate multiple LLMs** (OpenAI, Ollama, local models, etc.)
- 🔌 **Compose complex workflows** using agent squads and pipelines
- 🎯 **Schedule autonomous runs** with autopilots and triggers
- 📦 **Share capabilities** through a skill marketplace
- 🌐 **Distribute agents** across your network with zero configuration

Think of it as **"Docker for AI agents"** — but instead of managing containers, you're orchestrating intelligent agents.

---

## Why AgentForge?

### Problem: Multi-Agent Systems Are Hard

Building AI systems with multiple agents is complex:
- 😫 **Coordination overhead** — How do agents communicate?
- 🔧 **Configuration hell** — Each agent needs different setup
- 📦 **Capability sharing** — How do you reuse agent skills?
- 🚀 **Scaling challenges** — How do you run agents on different machines?
- 🔄 **Workflow management** — How do you chain tasks together?

### Solution: AgentForge

- ✅ **Agent Mesh** — Built-in P2P communication between agents
- ✅ **Zero-Config Discovery** — Auto-find agents on your network
- ✅ **Skills Marketplace** — Share and reuse agent capabilities
- ✅ **Task Orchestration** — Manage complex workflows easily
- ✅ **Distributed by Default** — Run agents anywhere

---

## Core Concepts

### 🤖 Agent

An **agent** is an autonomous AI entity that:
- Can process tasks independently
- Uses an LLM (OpenAI, Ollama, local models)
- Has a set of skills/capabilities
- Can communicate with other agents

**Types of Agents:**
- **LLM Agents** — Powered by OpenAI API, Ollama, or compatible services
- **CLI Agents** — Wrapper around command-line tools
- **Custom Agents** — Your own logic via plugins

### 👥 Squad

A **squad** is a group of agents working together:
- Each agent has a role
- They can delegate tasks to each other
- Results are aggregated by the squad manager
- Useful for multi-specialist scenarios

**Example:** Code review squad with:
- **Architecture Reviewer** — Checks design patterns
- **Performance Reviewer** — Analyzes efficiency
- **Security Reviewer** — Audits for vulnerabilities

### 🎯 Skill

A **skill** is a reusable capability that agents can use:
- Can be a function, API call, or complex workflow
- Shared through the marketplace
- Versioned and reviewable
- Easy to compose into workflows

**Example Skills:**
- `code-review` — Analyze code quality
- `semantic-search` — Find relevant documents
- `summarize` — Create summaries of large texts

### 🚀 Pipeline

A **pipeline** is a multi-step workflow:
- Chain multiple agents and tasks
- Support branching and conditional logic
- Run sequentially or in parallel
- Store results for analysis

### ⏰ Autopilot

An **autopilot** runs tasks automatically:
- On schedule (cron-like)
- On trigger (event-based)
- On manual request
- Results stored for history

---

## Your First Multi-Agent System

### Phase 1: Setup (5 minutes)

```bash
# Clone and install
git clone https://github.com/Finarfin12/AgentForge.git
cd agentforge

# Setup with one command
bash setup.sh

# Open UI
open http://localhost:3000
# Login: admin / admin123
```

### Phase 2: Register Your First Agent (5 minutes)

**Option A: Local LLM (Ollama)**

```bash
# First, install Ollama: https://ollama.ai
# Then pull a model
ollama pull mistral

# Start the agent
cd agents
cp .env.example .env
# Edit .env:
# AGENT_PROVIDER=ollama
# AGENT_MODEL=mistral
# AGENT_NAME=mistral-local
npm install
npm start
```

**Option B: OpenAI**

```bash
cd agents
cp .env.example .env
# Edit .env:
# AGENT_PROVIDER=openai
# AGENT_MODEL=gpt-4
# AGENT_NAME=gpt4-agent
# OPENAI_API_KEY=sk-...
npm install
npm start
```

### Phase 3: Create Your Squad (2 minutes)

In the AgentForge UI:

1. **Navigate to Squads** → Click "New Squad"
2. **Configure Squad:**
   - Name: `Code Review Squad`
   - Description: `Reviews code for quality, performance, and security`
3. **Add Agents:**
   - Select your registered agent(s)
   - Assign roles (e.g., "Reviewer", "Summarizer")
4. **Save**

### Phase 4: Run Your First Task (1 minute)

**Via UI:**
1. Go to **Tasks**
2. Click **New Task**
3. Select your squad
4. Enter a prompt: `"Review this code and suggest improvements:\n\nfunction fibonacci(n) { ... }"`
5. Click **Execute**

**Via API:**

```bash
curl -X POST http://localhost:3002/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "squad_id": "your-squad-id",
    "prompt": "Review this code for performance issues",
    "context": {
      "code": "for (let i = 0; i < arr.length; i++) { ... }"
    }
  }'
```

---

## Working with Skills

### Creating a Skill

Skills are packages of reusable functionality:

```typescript
// skills/code-analyzer/index.ts
export const skill = {
  name: 'code-analyzer',
  version: '1.0.0',
  description: 'Analyzes code for issues',
  
  async execute(code: string, language: string) {
    // Your analysis logic
    return {
      issues: [...],
      suggestions: [...],
      complexity_score: 7.2
    };
  }
};
```

### Publishing a Skill

```bash
# Package your skill
cd skills/code-analyzer
npm pack

# Push to marketplace
agentforge publish code-analyzer-1.0.0.tgz

# Share with team
# (Marketplace shows your skill in the UI)
```

### Using a Skill in Your Agent

```typescript
// In your agent's configuration
{
  name: 'code-reviewer',
  skills: [
    'code-analyzer',      // From marketplace
    'security-checker',
    'performance-profiler'
  ]
}
```

---

## Advanced Patterns

### Pattern 1: Debate/Consensus

Have multiple agents debate a topic:

```typescript
const squad = {
  name: 'debate-squad',
  mode: 'debate', // or 'consensus'
  agents: [
    { role: 'devil-advocate', model: 'gpt-4' },
    { role: 'supporter', model: 'gpt-4' },
    { role: 'judge', model: 'gpt-4-turbo' }
  ]
};

// Run task - agents discuss and reach consensus
const result = await agentforge.executeTask(squad, prompt);
```

### Pattern 2: Hierarchical Reasoning

Higher-level agents delegate to specialists:

```typescript
const hierarchy = {
  manager: 'gpt-4-turbo',
  specialists: {
    frontend: 'gpt-3.5-turbo',
    backend: 'gpt-3.5-turbo',
    database: 'gpt-3.5-turbo'
  }
};

// Manager orchestrates and delegates
```

### Pattern 3: Pipeline with Branching

Complex workflows with conditional logic:

```yaml
pipeline:
  - name: analyze
    agent: analyzer
    
  - name: check_complexity
    condition: "{{ steps.analyze.complexity > 7 }}"
    
  - if_true:
    - name: deep_review
      agent: specialist
    
  - if_false:
    - name: quick_review
      agent: junior
    
  - name: summarize
    agent: summarizer
```

### Pattern 4: Continuous Monitoring

Autopilot checks code quality continuously:

```typescript
const autopilot = {
  name: 'quality-monitor',
  trigger: 'on-push',           // Runs on every push
  schedule: '0 * * * *',        // Or hourly
  squad: 'code-review-squad',
  action: async (event) => {
    const result = await squad.executeTask({
      prompt: `Review recent changes in ${event.branch}`,
      context: { diff: event.diff }
    });
    
    if (result.severity > 5) {
      // Post comment on PR
      await github.createComment(result);
    }
  }
};
```

---

## Best Practices for AI Developers

### ✅ Do's

1. **Use squads for specialized roles** — Different agents for different expertise
2. **Version your skills** — Make skills reproducible and upgradeable
3. **Add context to tasks** — The more context, the better the results
4. **Monitor performance** — Track cost, latency, and quality metrics
5. **Cache results** — Avoid redundant LLM calls

### ❌ Don'ts

1. **Don't overload agents** — Keep tasks focused
2. **Don't skip error handling** — Agents can fail or timeout
3. **Don't use expensive models for everything** — Use cheaper models for simple tasks
4. **Don't ignore costs** — Monitor API usage and spending
5. **Don't hardcode settings** — Use environment variables

### 🎯 Performance Tips

```typescript
// ✅ Good: Use cheaper model for preprocessing
const squad = {
  agents: [
    { name: 'preprocessor', model: 'gpt-3.5-turbo' },    // $0.001
    { name: 'analyzer', model: 'gpt-4' }                  // $0.03
  ]
};

// ❌ Bad: Use expensive model for everything
const squad = {
  agents: [
    { name: 'agent1', model: 'gpt-4' },
    { name: 'agent2', model: 'gpt-4' }
  ]
};
```

---

## Next Steps

1. **Try the examples:** `docs/examples/`
2. **Build a skill:** `docs/skill-development.md`
3. **Deploy to production:** `docs/deployment.md`
4. **Join the community:** GitHub Discussions

---

## Troubleshooting

### Agent not connecting?
```bash
# Check backend is running
curl http://localhost:3002/health

# Check agent logs
tail -f agents.log
```

### Tasks timing out?
- Increase timeout: `TASK_TIMEOUT_MS=60000`
- Use faster model: Switch to `gpt-3.5-turbo`

### High costs?
- Use local models (Ollama)
- Batch similar tasks
- Cache results

---

## Resources

- 📖 [Full Documentation](../README.md)
- 💻 [API Reference](api-reference.md)
- 🛠️ [Skill Development](skill-development.md)
- 🚀 [Deployment Guide](deployment.md)
- 🤔 [FAQ](faq.md)

---

Happy building! 🚀
