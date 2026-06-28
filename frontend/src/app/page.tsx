'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';

export default function Home() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (token) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [token, router]);

  return (
    <div className="flex h-screen items-center justify-center bg-zinc-950">
      <div className="w-5 h-5 border-2 border-zinc-600 border-t-white rounded-full animate-spin" />
    </div>
  );
}
