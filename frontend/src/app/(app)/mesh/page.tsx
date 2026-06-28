'use client';
import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { io, Socket } from 'socket.io-client';
import { Activity, Wifi, WifiOff, Users, Zap } from 'lucide-react';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3002';

export default function MeshPage() {
  const [nodes, setNodes] = useState<any[]>([]);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [restNodes, setRestNodes] = useState<any[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Connect WebSocket as mesh node
    const socket = io(`${WS_URL}/mesh`, {
      query: { nodeId: `frontend-${Date.now()}`, name: 'Dashboard UI', agentId: 'ui' },
      transports: ['websocket'],
    });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('mesh:registered', (data) => console.log('Registered:', data));
    socket.on('mesh:node-list', (list) => setNodes(list));
    socket.on('mesh:message', (msg) => setMessages((prev) => [msg, ...prev].slice(0, 50)));

    socketRef.current = socket;
    return () => { socket.close(); };
  }, []);

  useEffect(() => {
    api.mesh.nodes().then((res: any) => setRestNodes(res.nodes || [])).catch(() => {});
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white flex items-center gap-2">
            <Activity size={18} /> Agent Mesh
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">Peer-to-peer agent network</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {connected ? (
            <span className="flex items-center gap-1 text-green-400"><Wifi size={14} /> Connected</span>
          ) : (
            <span className="flex items-center gap-1 text-zinc-500"><WifiOff size={14} /> Disconnected</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* WebSocket-connected nodes */}
        <Card className="bg-zinc-950 border-zinc-800 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Wifi size={14} /> Connected Nodes ({nodes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {nodes.length === 0 ? (
              <p className="text-xs text-zinc-500">No nodes connected. Agents will appear here when they join the mesh.</p>
            ) : (
              <div className="space-y-2">
                {nodes.map((node: any) => (
                  <div key={node.id} className="flex items-center justify-between bg-zinc-900/50 rounded-lg px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm text-white">{node.name}</p>
                      <p className="text-xs text-zinc-500 font-mono">{node.id.substring(0, 20)}... | {node.address}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-500">
                        {Math.round((Date.now() - new Date(node.lastSeen).getTime()) / 1000)}s ago
                      </span>
                      <span className={`w-2 h-2 rounded-full ${Date.now() - new Date(node.lastSeen).getTime() < 15000 ? 'bg-green-500' : 'bg-yellow-500'}`} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <Card className="bg-zinc-950 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap size={14} /> Mesh Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">WebSocket Peers</span>
              <span className="text-white">{nodes.length}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">API Registered</span>
              <span className="text-white">{restNodes.length}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">Messages</span>
              <span className="text-white">{messages.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent messages */}
      {messages.length > 0 && (
        <Card className="bg-zinc-950 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm">Recent Mesh Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {messages.map((msg, i) => (
                <div key={i} className="text-xs text-zinc-500 font-mono bg-zinc-900/30 rounded px-2 py-1">
                  <span className="text-zinc-400">{msg.from}</span>
                  {' → '}
                  <span className="text-zinc-400">{msg.to}</span>
                  {' '}
                  <span className="text-blue-400">{msg.type}</span>
                  {': '}
                  {typeof msg.payload === 'string' ? msg.payload.substring(0, 100) : JSON.stringify(msg.payload).substring(0, 100)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
