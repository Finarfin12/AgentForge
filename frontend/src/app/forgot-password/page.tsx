'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.auth.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white px-4 font-sans">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-light tracking-tight">Reset password</h1>
          <p className="text-zinc-500 text-sm mt-2">Enter your email to receive a reset link</p>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <p className="text-green-400 text-sm">If that email is registered, a reset link has been sent.</p>
            <Link href="/login" className="block text-sm text-zinc-400 hover:text-white transition-colors">
              Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-transparent border-zinc-800 rounded-none focus-visible:border-white focus-visible:ring-0"
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" loading={loading} className="w-full rounded-none bg-white text-black hover:bg-zinc-200">
              Send reset link
            </Button>
            <p className="text-center text-sm text-zinc-500 mt-4">
              <Link href="/login" className="text-zinc-400 hover:text-white transition-colors">
                Back to login
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}