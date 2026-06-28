'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAgentStore } from './store';

let agentSocket: Socket | null = null;
let threadSocket: Socket | null = null;
const threadListeners = new Map<string, Set<(data: any) => void>>();

export function useAgentSocket() {
  const updateAgent = useAgentStore((s) => s.updateAgent);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3002';
    agentSocket = io(`${WS_URL}/agents`, {
      transports: ['websocket'],
      reconnectionAttempts: 5,
    });

    agentSocket.on('agent:status', (data: { id: string; status: string }) => {
      updateAgent(data.id, { status: data.status as never });
    });

    agentSocket.on('agent:updated', (data: { agentId: string } & Record<string, unknown>) => {
      const { agentId, ...patch } = data;
      updateAgent(agentId, patch as never);
    });

    return () => {
      agentSocket?.disconnect();
      agentSocket = null;
      initialized.current = false;
    };
  }, [updateAgent]);

  return agentSocket;
}

export function useThreadSocket(onProgress?: (data: any) => void) {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3002';
    threadSocket = io(`${WS_URL}/threads`, {
      transports: ['websocket'],
      reconnectionAttempts: 5,
    });

    threadSocket.on('deliberation:progress', (data: any) => {
      if (onProgress) onProgress(data);
      const listeners = threadListeners.get(data.threadId);
      if (listeners) {
        listeners.forEach(fn => fn(data));
      }
    });

    return () => {
      threadSocket?.disconnect();
      threadSocket = null;
      initialized.current = false;
      threadListeners.clear();
    };
  }, []);

  return threadSocket;
}

export function subscribeToThread(threadId: string, callback: (data: any) => void) {
  if (!threadListeners.has(threadId)) {
    threadListeners.set(threadId, new Set());
  }
  threadListeners.get(threadId)!.add(callback);
  return () => {
    const listeners = threadListeners.get(threadId);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) threadListeners.delete(threadId);
    }
  };
}

// Agent Messages WebSocket
let msgSocket: Socket | null = null;
const msgListeners = new Set<(msg: any) => void>();

export function useAgentMessageSocket(onNewMessage?: (msg: any) => void) {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3002';
    msgSocket = io(`${WS_URL}/agent-messages`, {
      transports: ['websocket'],
      reconnectionAttempts: 5,
    });

    msgSocket.on('agent-message:new', (msg: any) => {
      if (onNewMessage) onNewMessage(msg);
      msgListeners.forEach(fn => fn(msg));
    });

    return () => {
      msgSocket?.disconnect();
      msgSocket = null;
      initialized.current = false;
      msgListeners.clear();
    };
  }, []);

  return msgSocket;
}

export function subscribeToNewMessages(callback: (msg: any) => void) {
  msgListeners.add(callback);
  return () => msgListeners.delete(callback);
}
