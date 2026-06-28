'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { User } from '@/lib/types';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.auth.login(identifier, password);
      setAuth(res.token, res.user as User);
      router.replace('/dashboard');
    } catch (err) {
      setError((err as Error).message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white px-4 font-sans">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-light tracking-tight">Welcome back</h1>
          <p className="text-zinc-500 text-sm mt-2">Enter your credentials to continue</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <Input
            label="Email or Username"
            placeholder="name@example.com"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            className="bg-transparent border-zinc-800 rounded-none focus-visible:border-white focus-visible:ring-0"
          />
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-sm font-medium text-zinc-300">Password</label>
              <Link href="/forgot-password" className="text-xs text-zinc-500 hover:text-white transition-colors">
                Forgot password?
              </Link>
            </div>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-transparent border-zinc-800 rounded-none focus-visible:border-white focus-visible:ring-0"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" loading={loading} className="w-full rounded-none bg-white text-black hover:bg-zinc-200">
            Sign In
          </Button>
        </form>

        <p className="text-center text-sm text-zinc-500 mt-8">
          Don't have an account?{' '}
          <Link href="/register" className="text-white hover:underline underline-offset-4">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
