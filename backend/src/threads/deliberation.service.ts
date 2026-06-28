import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { IntegrationsService } from '../integrations/integrations.service';
import { AgentsService } from '../agents/agents.service';
import { ThreadsService } from './threads.service';
import { ThreadsGateway } from './threads.gateway';
import { 
  threads, 
  threadMessages, 
  deliberationSessions, 
  deliberationRounds,
  agents
} from '../database/schema';
import { eq, inArray, desc } from 'drizzle-orm';

interface Vote {
  position: 'approve' | 'disagree' | 'abstain';
  preferredSolution: string;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

interface ConsensusResult {
  reached: boolean;
  solution?: string;
  agreement?: number;
  confidence?: number;
  dissenting?: string[];
  synthesis?: string;
}

interface AgentResponse {
  agentId: string;
  agentName: string;
  content: string;
  vote: Vote | null;
}

const AGENT_ROLES = {
  default: `You are a domain expert in an agent roundtable discussion. You MUST respond directly to the topic and to what other agents have said. Be specific, analytical, and constructive. Do NOT greet, introduce yourself, or make small talk. Focus ONLY on the problem and proposed solutions.`
};

@Injectable()
export class DeliberationService {
  private readonly logger = new Logger(DeliberationService.name);

  constructor(
    private db: DatabaseService,
    private integrations: IntegrationsService,
    private agentsService: AgentsService,
    private threadsService: ThreadsService,
    private threadsGateway: ThreadsGateway,
  ) {}

  async startDeliberation(
    threadId: string,
    problemStatement: string,
    options?: {
      agentIds?: string[];
      maxRounds?: number;
      timeoutSeconds?: number;
    }
  ) {
    const thread = await this.threadsService.findOne(threadId);

    // 1. Select participants
    let participantAgentIds = options?.agentIds || [];
    if (participantAgentIds.length === 0) {
      const activeAgents = await this.agentsService.findAll({ isActive: true });
      participantAgentIds = activeAgents.map(a => a.id);
    }
    
    if (participantAgentIds.length < 2) {
      throw new BadRequestException('At least 2 agents are required for deliberation');
    }

    // 2. Create session
    const [session] = await this.db.drizzle
      .insert(deliberationSessions)
      .values({
        threadId,
        problemStatement,
        participantAgentIds,
        maxRounds: options?.maxRounds || 5,
        timeoutSeconds: options?.timeoutSeconds || 300,
        status: 'discussing',
      })
      .returning();

    // 3. Add system message
    await this.threadsService.addMessage(
      threadId,
      'system',
      `Deliberation started with ${participantAgentIds.length} agents. Topic: ${problemStatement}`
    );

    // 4. Pre-flight: test provider connectivity (no prompts to agents)
    const providerHealth = await this.integrations.healthCheckAll();
    const agentStatuses: string[] = [];
    for (const agentId of participantAgentIds) {
      try {
        const agent = await this.agentsService.findOne(agentId);
        const providerName = (agent.config as any)?.provider || 'ollama';
        const online = providerHealth[providerName] === true;
        agentStatuses.push(`${agent.name}: ${online ? '✅ online' : '⚠️ provider unreachable'}`);
      } catch {
        agentStatuses.push(`Agent ${agentId}: ⚠️ unknown`);
      }
    }

    await this.threadsService.addMessage(
      threadId,
      'system',
      `**🧠 Deliberation Started**\n\n**Topic:** ${problemStatement}\n**Agents:** ${participantAgentIds.length}\n\n${agentStatuses.map(r => `- ${r}`).join('\n')}\n\n_Agents are now discussing. Results will appear below..._`
    );

    // 5. Emit started event
    this.emitProgress(threadId, 'deliberation:started', {
      sessionId: session.id,
      problemStatement,
      agentCount: participantAgentIds.length,
      maxRounds: session.maxRounds,
    });

    // 6. Start first round asynchronously
    this.runDeliberation(session.id).catch(err => {
      this.logger.error(`Deliberation failed: ${err.message}`);
      this.emitProgress(threadId, 'deliberation:failed', { error: err.message });
      this.threadsService.addMessage(threadId, 'system', `❌ Deliberation failed: ${err.message}`).catch(() => {});
    });

    return session;
  }

  async getStatus(threadId: string) {
    const [session] = await this.db.drizzle
      .select()
      .from(deliberationSessions)
      .where(eq(deliberationSessions.threadId, threadId))
      .orderBy(desc(deliberationSessions.createdAt))
      .limit(1);

    if (!session) {
      return { active: false };
    }

    const rounds = await this.db.drizzle
      .select()
      .from(deliberationRounds)
      .where(eq(deliberationRounds.sessionId, session.id))
      .orderBy(deliberationRounds.roundNumber);

    return { active: true, session, rounds };
  }

  private async runDeliberation(sessionId: string) {
    let [session] = await this.db.drizzle
      .select()
      .from(deliberationSessions)
      .where(eq(deliberationSessions.id, sessionId))
      .limit(1);

    const agentIds = session.participantAgentIds || [];
    const threadId = session.threadId;

    // Fetch agent names upfront
    const agentNames: string[] = [];
    for (const aid of agentIds) {
      try {
        const a = await this.agentsService.findOne(aid);
        agentNames.push(a.displayName || a.name);
      } catch {
        agentNames.push('Unknown');
      }
    }

    const maxRounds = session.maxRounds || 5;
    for (let round = 1; round <= maxRounds; round++) {
      this.logger.log(`Deliberation ${sessionId} - Round ${round}/${session.maxRounds}`);

      [session] = await this.db.drizzle
        .update(deliberationSessions)
        .set({ currentRound: round })
        .where(eq(deliberationSessions.id, sessionId))
        .returning();

      const [roundRecord] = await this.db.drizzle
        .insert(deliberationRounds)
        .values({ sessionId, roundNumber: round, status: 'in_progress', startedAt: new Date() })
        .returning();

      this.emitProgress(threadId, 'deliberation:round:start', {
        round,
        maxRounds,
        totalAgents: agentIds.length,
      });

      // Agents respond SEQUENTIALLY within each round
      const responses: AgentResponse[] = [];
      for (let i = 0; i < agentIds.length; i++) {
        const agentId = agentIds[i];
        const agentName = agentNames[i];

        this.emitProgress(threadId, 'deliberation:agent:start', {
          round,
          agentId,
          agentName,
          agentIndex: i,
          totalAgents: agentIds.length,
        });

        const prevInRound = responses.map(r => {
          const name = r.agentName || 'Peer Agent';
          return `${name} said:\n${r.content}`;
        }).join('\n\n');

        const context = await this.buildDiscussionContext(session.threadId);
        const prompt = this.generateSequentialPrompt(session, round, i, agentIds.length, prevInRound);

        const response = await this.callSingleAgent(agentId, context, prompt);
        responses.push(response);

        // Save immediately so other agents see it in the next iteration
        await this.db.drizzle.insert(threadMessages).values({
          threadId: session.threadId,
          role: 'agent',
          agentId: response.agentId,
          agentName: response.agentName,
          content: response.content,
          deliberationSessionId: sessionId,
          deliberationRoundId: roundRecord.id,
          voteData: response.vote,
          isConsensusVote: !!response.vote,
        });

        this.emitProgress(threadId, 'deliberation:agent:done', {
          round,
          agentId: response.agentId,
          agentName: agentName,
          agentIndex: i,
          totalAgents: agentIds.length,
          vote: response.vote,
        });
      }

      await this.db.drizzle
        .update(deliberationRounds)
        .set({ status: 'completed', completedAt: new Date() })
        .where(eq(deliberationRounds.id, roundRecord.id));

      const allVotes = responses.map(r => r.vote).filter(v => v !== null) as Vote[];
      const thresholdStr = session.consensusThreshold as string;
      const threshold = thresholdStr ? parseFloat(thresholdStr) : 1.0;
      const consensus = this.checkConsensus(allVotes, threshold);
      const disagreeCount = allVotes.filter(v => v.position === 'disagree').length;

      this.logger.log(`Round ${round} votes: ${allVotes.length} total, ${disagreeCount} disagree, threshold=${threshold}`);

      this.emitProgress(threadId, 'deliberation:round:complete', {
        round,
        maxRounds,
        totalVotes: allVotes.length,
        approveCount: allVotes.filter(v => v.position === 'approve').length,
        disagreeCount,
        abstainCount: allVotes.filter(v => v.position === 'abstain').length,
        consensusReached: consensus.reached,
      });

      if (consensus.reached) {
        this.emitProgress(threadId, 'deliberation:resolving', {});
        await this.resolveDeliberation(session, consensus);
        this.emitProgress(threadId, 'deliberation:resolved', {
          solution: consensus.solution,
        });
        return;
      }

      if (round < maxRounds) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    await this.handleMaxRoundsReached(session);
    this.emitProgress(threadId, 'deliberation:failed', {
      reason: 'Max rounds reached without consensus',
    });
  }

  private emitProgress(threadId: string, event: string, data: Record<string, unknown>) {
    try {
      this.threadsGateway.emitDeliberationProgress(threadId, event, data);
    } catch (err) {
      // Gateway may not be initialized; silently ignore
    }
  }

  private generateSequentialPrompt(session: any, round: number, agentIndex: number, totalAgents: number, previousResponses: string): string {
    const isFirst = agentIndex === 0;
    const isLast = agentIndex === totalAgents - 1;

    if (round === 1) {
      if (isFirst) {
        return `TOPIC: ${session.problemStatement}\n\nYou are the FIRST to speak in this opening round. Provide your initial analysis of the problem and your proposed solution. Be thorough.\n\nAt the end, include your vote:\n---\n**My Position:** [summary]\n**Vote:** [APPROVE / DISAGREE / ABSTAIN]\n**Preferred Solution:** [your solution]\n**Confidence:** [high / medium / low]\n---`;
      } else {
        return `TOPIC: ${session.problemStatement}\n\nYou are speaking after the previous agent(s). Read their positions and respond:\n\n${previousResponses}\n\nDo you agree or disagree with what they said? Build on their ideas, point out flaws, or propose alternatives. Then give your own analysis.\n\nAt the end, include your vote:\n---\n**My Position:** [summary]\n**Vote:** [APPROVE / DISAGREE / ABSTAIN]\n**Preferred Solution:** [your solution]\n**Confidence:** [high / medium / low]\n---`;
      }
    } else if (round === session.maxRounds) {
      if (isFirst) {
        return `FINAL ROUND. TOPIC: ${session.problemStatement}\n\nReview the entire discussion above. Provide your FINAL position:\n- Has your view changed?\n- What is your final recommendation?\n- What compromises do you accept?\n\nAt the end, include your FINAL vote:\n---\n**My Position:** [summary]\n**Vote:** [APPROVE / DISAGREE / ABSTAIN]\n**Preferred Solution:** [final solution]\n**Confidence:** [high / medium / low]\n---`;
      } else {
        return `FINAL ROUND. TOPIC: ${session.problemStatement}\n\nThe following agents have given their final positions:\n\n${previousResponses}\n\nYou are the next to vote. Respond to their final positions and cast your FINAL vote:\n---\n**My Position:** [summary]\n**Vote:** [APPROVE / DISAGREE / ABSTAIN]\n**Preferred Solution:** [final solution]\n**Confidence:** [high / medium / low]\n---`;
      }
    } else {
      if (isFirst) {
        return `ROUND ${round}. TOPIC: ${session.problemStatement}\n\nReview the discussion so far. Address any points from previous rounds that need clarification. Then state your current position.\n\nAt the end, include your UPDATED vote:\n---\n**My Position:** [summary]\n**Vote:** [APPROVE / DISAGREE / ABSTAIN]\n**Preferred Solution:** [your solution]\n**Confidence:** [high / medium / low]\n---`;
      } else {
        return `ROUND ${round}. TOPIC: ${session.problemStatement}\n\nYour peers have spoken:\n\n${previousResponses}\n\nRespond directly to their arguments. What do you agree with? What do you challenge? Can you find common ground?\n\nAt the end, include your UPDATED vote:\n---\n**My Position:** [summary]\n**Vote:** [APPROVE / DISAGREE / ABSTAIN]\n**Preferred Solution:** [your solution]\n**Confidence:** [high / medium / low]\n---`;
      }
    }
  }

  private async buildDiscussionContext(threadId: string): Promise<string> {
    const msgs = await this.threadsService.getMessages(threadId);
    let ctx = '';
    for (const msg of msgs) {
      if (msg.role === 'system') continue;
      const name = msg.agentName || (msg.role === 'user' ? 'User' : 'Unknown Agent');
      ctx += `[${name}]: ${msg.content}\n\n`;
    }
    return ctx;
  }

  private async callSingleAgent(agentId: string, context: string, instruction: string): Promise<AgentResponse> {
    try {
      const agent = await this.agentsService.findOne(agentId);
      const providerName = (agent.config as any)?.provider || 'ollama';
      const model = (agent.config as any)?.model || (providerName === 'ollama' ? 'llama3' : 'default');
      const temperature = (agent.config as any)?.temperature || 0.7;

      const messages = [
        { role: 'system' as const, content: AGENT_ROLES.default },
        { role: 'user' as const, content: `PREVIOUS DISCUSSION:\n${context}\n\nYOUR TASK:\n${instruction}` }
      ];

      const response = await this.integrations.chatCompletion(providerName, {
        model,
        messages,
        temperature,
        maxTokens: 2048,
      });

      return {
        agentId: agent.id,
        agentName: agent.name,
        content: response.content,
        vote: this.parseVote(response.content),
      };
    } catch (err) {
      this.logger.warn(`Agent ${agentId} failed: ${(err as Error).message}`);
      return {
        agentId,
        agentName: 'Unknown Agent',
        content: `[Agent unavailable: ${(err as Error).message}]`,
        vote: null,
      };
    }
  }

  private parseVote(content: string): Vote | null {
    const voteRegex = /\\*\\*My Position:\\*\\*\\s*(.*?)\\n\\*\\*Vote:\\*\\*\\s*(APPROVE|DISAGREE|ABSTAIN)\\n\\*\\*Preferred Solution:\\*\\*\\s*(.*?)\\n\\*\\*Confidence:\\*\\*\\s*(high|medium|low)/is;
    const match = content.match(voteRegex);
    if (!match) {
      // Fallback rough parsing if exact format fails
      if (content.includes('Vote:') && content.includes('Preferred Solution:')) {
        return {
          position: content.toLowerCase().includes('approve') ? 'approve' : 'abstain',
          preferredSolution: 'Auto-parsed from context',
          confidence: 'medium',
          reasoning: 'Auto-extracted',
        };
      }
      return null;
    }
    return {
      reasoning: match[1].trim(),
      position: match[2].toLowerCase() as 'approve' | 'disagree' | 'abstain',
      preferredSolution: match[3].trim(),
      confidence: match[4].toLowerCase() as 'high' | 'medium' | 'low',
    };
  }

  private checkConsensus(votes: Vote[], threshold: number): ConsensusResult {
    const approveVotes = votes.filter(v => v.position === 'approve');
    const disagreeVotes = votes.filter(v => v.position === 'disagree');
    const abstainVotes = votes.filter(v => v.position === 'abstain');

    if (approveVotes.length === 0) return { reached: false };

    // Group only APPROVE votes by preferred solution
    const solutionMap = new Map<string, Vote[]>();
    for (const vote of approveVotes) {
      const key = vote.preferredSolution.toLowerCase().trim().substring(0, 50);
      if (!solutionMap.has(key)) solutionMap.set(key, []);
      solutionMap.get(key)!.push(vote);
    }

    let majoritySolution = '';
    let majorityCount = 0;
    for (const [solution, voters] of solutionMap) {
      if (voters.length > majorityCount) {
        majorityCount = voters.length;
        majoritySolution = solution;
      }
    }

    const agreementRatio = votes.length > 0 ? majorityCount / votes.length : 0;
    if (agreementRatio >= threshold && disagreeVotes.length === 0) {
      const majorityVoters = solutionMap.get(majoritySolution) || [];
      const confScore = majorityVoters.reduce((acc, v) => acc + (v.confidence === 'high' ? 1 : v.confidence === 'medium' ? 0.6 : 0.3), 0) / majorityVoters.length;

      return {
        reached: true,
        solution: majoritySolution,
        agreement: agreementRatio,
        confidence: confScore,
        dissenting: disagreeVotes.map(v => v.reasoning || v.preferredSolution),
      };
    }

    return { reached: false };
  }

  private async resolveDeliberation(session: any, consensus: ConsensusResult) {
    const synthesis = await this.generateSynthesis(session, consensus);
    
    await this.db.drizzle
      .update(deliberationSessions)
      .set({
        status: 'resolved',
        consensusReached: true,
        consensusResult: {
          solution: consensus.solution,
          agreement: consensus.agreement,
          confidence: consensus.confidence,
          dissenting: consensus.dissenting,
          synthesis,
        },
        completedAt: new Date(),
      })
      .where(eq(deliberationSessions.id, session.id));

    await this.db.drizzle
      .update(threads)
      .set({
        status: 'resolved',
        consensusReached: true,
        consensusResult: { solution: consensus.solution, synthesis },
      })
      .where(eq(threads.id, session.threadId));

    const dissenting = consensus.dissenting?.length
      ? `\n\n**Dissenting views:** ${consensus.dissenting.join('; ')}`
      : '';

    await this.threadsService.addMessage(
      session.threadId,
      'system',
      `✅ CONSENSUS REACHED\n\n${synthesis}${dissenting}`
    );
  }

  private async handleMaxRoundsReached(session: any) {
    // Check latest votes for context
    const msgs = await this.threadsService.getMessages(session.threadId);
    const lastAgentMsgs = msgs.filter(m => m.role === 'agent' && m.deliberationSessionId === session.id);
    const disagreeingAgents = lastAgentMsgs
      .filter((m: any) => m.voteData?.position === 'disagree')
      .map((m: any) => m.agentName || 'Unknown');

    await this.db.drizzle
      .update(deliberationSessions)
      .set({
        status: 'failed',
        consensusReached: false,
        completedAt: new Date(),
      })
      .where(eq(deliberationSessions.id, session.id));

    const detail = disagreeingAgents.length
      ? `\n\n**Agents still disagreeing:** ${disagreeingAgents.join(', ')}\n\nConsider refining the problem statement or providing more context.`
      : '';

    await this.threadsService.addMessage(
      session.threadId,
      'system',
      `❌ DELIBERATION ENDED WITHOUT CONSENSUS\n\nMaximum rounds (${session.maxRounds || 5}) reached without unanimous agreement.${detail}`
    );
  }

  private async generateSynthesis(session: any, consensus: ConsensusResult): Promise<string> {
    const context = await this.buildDiscussionContext(session.threadId);
    
    // Pick the first agent's config to generate synthesis, or fallback to ollama default
    let providerName = 'ollama';
    let model = 'default';
    if (session.participantAgentIds && session.participantAgentIds.length > 0) {
      const agent = await this.agentsService.findOne(session.participantAgentIds[0]);
      if (agent) {
        providerName = (agent.config as any)?.provider || 'ollama';
        model = (agent.config as any)?.model || (providerName === 'ollama' ? 'llama3' : 'default');
      }
    }

    const response = await this.integrations.chatCompletion(providerName, {
      model,
      messages: [
        { role: 'system', content: 'You are a neutral synthesizer. Generate a clear, actionable summary of the consensus reached.' },
        { role: 'user', content: `DISCUSSION:\n${context}\n\nCONSENSUS:\n- Solution: ${consensus.solution}\n- Agreement: ${((consensus.agreement || 0) * 100).toFixed(0)}%\n- Dissenting views: ${(consensus.dissenting || []).join(', ') || 'None'}\n\nGenerate a clear synthesis that:\n1. Summarizes the agreed solution\n2. Acknowledges dissenting views\n3. Provides next steps` }
      ],
      temperature: 0.3,
    });
    
    return response.content;
  }
}
