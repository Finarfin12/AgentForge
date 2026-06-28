'use client';
import { Spinner } from '@/components/Spinner';
import { AppAlert } from '@/lib/alert';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Plus, Play, Trash2, ArrowDown, Bot, Settings } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';

export default function PipelineBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const [pipeline, setPipeline] = useState<any>(null);
  const [steps, setSteps] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showAdd, setShowAdd] = useState(false);
  const [newStep, setNewStep] = useState({ name: '', agentId: '', prompt: '' });
  const [initialInput, setInitialInput] = useState('');
  const [executions, setExecutions] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      // Auto refresh if running
      if (pipeline?.status === 'running') fetchData();
    }, 3000);
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    if (pipeline && pipeline.status !== 'running') {
      api.pipelines.getExecutions(id).then(setExecutions).catch(() => {});
    }
  }, [id, pipeline?.status]);

  async function fetchData() {
    try {
      const [pData, sData, aData] = await Promise.all([
        api.pipelines.get(id),
        api.pipelines.getSteps(id),
        api.agents.list()
      ]);
      setPipeline(pData);
      setSteps(sData as any[]);
      setAgents(aData as any[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddStep(e: React.FormEvent) {
    e.preventDefault();
    if (!newStep.name || !newStep.agentId) return;
    try {
      await api.pipelines.addStep(id, {
        name: newStep.name,
        agentId: newStep.agentId,
        description: 'Pipeline step',
        config: { prompt: newStep.prompt }
      });
      setShowAdd(false);
      setNewStep({ name: '', agentId: '', prompt: '' });
      fetchData();
    } catch (err) {
      AppAlert.error((err as Error).message);
    }
  }

  async function handleRemoveStep(stepId: string) {
    const confirmed = await AppAlert.confirm('Remove this step?');
    if (!confirmed) return;
    try {
      await api.pipelines.removeStep(id, stepId);
      fetchData();
    } catch (err) {
      AppAlert.error((err as Error).message);
    }
  }

  async function handleRun() {
    if (steps.length === 0) return AppAlert.warning('Add steps first');
    try {
      await api.pipelines.execute(id, initialInput);
      setPipeline({ ...pipeline, status: 'running' });
      fetchData();
    } catch (err) {
      AppAlert.error((err as Error).message);
    }
  }

  if (!pipeline) { return loading ? <Spinner /> : <div className="p-8 text-center text-zinc-400">Pipeline not found.</div>; }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => router.push('/pipelines')} className="text-xs text-purple-400 hover:underline mb-1">← Back to Pipelines</button>
          <h1 className="text-xl font-semibold text-white">{pipeline.name}</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Vertical Sequence Builder</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm">
            Status: <span className="text-white capitalize">{pipeline.status}</span>
          </div>
          <Button onClick={handleRun} disabled={pipeline.status === 'running'} className="bg-green-600 hover:bg-green-700 text-white">
            <Play size={14} className="mr-2" /> {pipeline.status === 'running' ? 'Running...' : 'Run Pipeline'}
          </Button>
          <Button onClick={async () => {
            const confirmed = await AppAlert.confirm('Delete this pipeline?');
            if (!confirmed) return;
            try {
              await api.pipelines.delete(id);
              router.push('/pipelines');
            } catch (err) {
              AppAlert.error((err as Error).message);
            }
          }} variant="danger" className="bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-800/50">
            <Trash2 size={14} /> Delete
          </Button>
        </div>
      </div>

      <div className="bg-zinc-950 p-4 border border-zinc-800 rounded-lg">
        <label className="text-sm text-zinc-400 mb-2 block">Initial Input Data (optional)</label>
        <Textarea 
          placeholder="Starting context or data to feed into the first step..."
          className="bg-zinc-900 border-zinc-800"
          value={initialInput}
          onChange={(e) => setInitialInput(e.target.value)}
          disabled={pipeline.status === 'running'}
        />
      </div>

      <div className="space-y-4 pt-4">
        {steps.map((step, index) => {
          const agent = agents.find(a => a.id === step.agentId);
          return (
            <div key={step.id} className="relative">
              <Card className={`border-zinc-800 transition-colors ${step.status === 'running' ? 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'bg-zinc-950'}`}>
                <CardContent className="p-4 flex gap-4">
                  <div className="flex flex-col items-center justify-center bg-zinc-900 w-12 h-12 rounded-lg shrink-0">
                    <span className="text-xs text-zinc-500 font-medium">#{index + 1}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium text-white">{step.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded ${step.status === 'running' ? 'bg-purple-900/50 text-purple-400 animate-pulse' : step.status === 'completed' ? 'bg-green-900/50 text-green-400' : step.status === 'failed' ? 'bg-red-900/50 text-red-400' : 'bg-zinc-800 text-zinc-400'}`}>
                          {step.status}
                        </span>
                        <button onClick={() => handleRemoveStep(step.id)} className="text-zinc-600 hover:text-red-400" disabled={pipeline.status === 'running'}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-xs text-zinc-400">
                      <Bot size={12} className="text-blue-400" />
                      <span>Agent: <strong>{agent?.displayName || step.agentId}</strong></span>
                    </div>
                    {step.config?.prompt && (
                      <div className="mt-3 text-sm text-zinc-500 bg-zinc-900/50 p-2 rounded italic">
                        {step.config.prompt}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {index < steps.length - 1 && (
                <div className="flex justify-center my-2">
                  <ArrowDown className="text-zinc-700 animate-bounce" size={20} />
                </div>
              )}
            </div>
          );
        })}

        {steps.length > 0 && !showAdd && (
          <div className="flex justify-center my-2">
            <ArrowDown className="text-zinc-700" size={20} />
          </div>
        )}

        {showAdd ? (
          <Card className="border-dashed border-2 border-zinc-700 bg-zinc-950/50">
            <CardContent className="p-4">
              <form onSubmit={handleAddStep} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Step Name</label>
                    <Input placeholder="e.g. Research Topic" value={newStep.name} onChange={e => setNewStep({...newStep, name: e.target.value})} required />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Assign Agent</label>
                    <select 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-md h-10 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      value={newStep.agentId} 
                      onChange={e => setNewStep({...newStep, agentId: e.target.value})}
                      required
                    >
                      <option value="" disabled>Select an agent...</option>
                      {agents.map(a => (
                        <option key={a.id} value={a.id}>{a.displayName} ({a.config?.model || a.name})</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Instruction / Prompt</label>
                  <Textarea placeholder="Instructions for the agent in this step. It will also receive the output of the previous step automatically." 
                    value={newStep.prompt} onChange={e => setNewStep({...newStep, prompt: e.target.value})} />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button type="submit">Add Step</Button>
                  <Button type="button" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Button variant="secondary" className="w-full border-dashed" onClick={() => setShowAdd(true)} disabled={pipeline.status === 'running'}>
            <Plus size={16} className="mr-2" /> Add Step
          </Button>
        )}
      </div>

      {executions.length > 0 && (
        <div className="pt-6 border-t border-zinc-800">
          <h2 className="text-lg font-semibold text-white mb-4">Execution Results</h2>
          <div className="space-y-3">
            {executions.slice().reverse().slice(0, 5).map((exec: any) => (
              <Card key={exec.id} className="bg-zinc-950 border-zinc-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-zinc-500">
                      {new Date(exec.createdAt).toLocaleString()}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      exec.status === 'completed' ? 'bg-green-900/50 text-green-400' :
                      exec.status === 'failed' ? 'bg-red-900/50 text-red-400' :
                      exec.status === 'running' ? 'bg-blue-900/50 text-blue-400' :
                      'bg-zinc-800 text-zinc-400'
                    }`}>
                      {exec.status}
                    </span>
                  </div>
                  {exec.output && (
                    <pre className="text-sm text-zinc-300 bg-zinc-900 p-3 rounded overflow-x-auto whitespace-pre-wrap">
                      {typeof exec.output === 'string' ? exec.output : JSON.stringify(exec.output, null, 2)}
                    </pre>
                  )}
                  {exec.error && (
                    <pre className="text-sm text-red-400 bg-red-900/20 p-3 rounded overflow-x-auto whitespace-pre-wrap mt-2">
                      {exec.error}
                    </pre>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
