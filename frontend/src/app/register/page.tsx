'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { User } from '@/lib/types';

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({
    email: '',
    username: '',
    password: '',
    displayName: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.auth.register(form);
      setAuth(res.token, res.user as User);
      router.replace('/dashboard');
    } catch (err) {
      setError((err as Error).message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white px-4 font-sans">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-light tracking-tight">Create an account</h1>
          <p className="text-zinc-500 text-sm mt-2">Enter your details to get started</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-5">
          <Input
            label="Display Name"
            placeholder="John Doe"
            value={form.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            className="bg-transparent border-zinc-800 rounded-none focus-visible:border-white focus-visible:ring-0"
          />
          <Input
            label="Username"
            placeholder="johndoe"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
            className="bg-transparent border-zinc-800 rounded-none focus-visible:border-white focus-visible:ring-0"
          />
          <Input
            label="Email"
            type="email"
            placeholder="name@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            className="bg-transparent border-zinc-800 rounded-none focus-visible:border-white focus-visible:ring-0"
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            className="bg-transparent border-zinc-800 rounded-none focus-visible:border-white focus-visible:ring-0"
          />

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <Button type="submit" loading={loading} className="w-full rounded-none bg-white text-black hover:bg-zinc-200 mt-2">
            Sign Up
          </Button>
        </form>

        <p className="text-center text-sm text-zinc-500 mt-8">
          Already have an account?{' '}
          <Link href="/login" className="text-white hover:underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
