'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';

type Mode = 'login' | 'signup';

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const client = createClient();
    try {
      if (mode === 'login') {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await client.auth.signUp({ email, password });
        if (error) throw error;
      }
      router.push('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    const client = createClient();
    await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900">
      <div className="w-full max-w-sm rounded-xl border border-gray-700 bg-gray-800 p-8">
        <h1 className="mb-6 text-center text-2xl font-bold text-white">
          {mode === 'login' ? 'Sign in' : 'Create account'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-2 font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {loading ? 'Loading…' : mode === 'login' ? 'Sign in' : 'Sign up'}
          </button>
        </form>

        <div className="my-4 flex items-center gap-3">
          <div className="flex-1 border-t border-gray-600" />
          <span className="text-sm text-gray-400">or</span>
          <div className="flex-1 border-t border-gray-600" />
        </div>

        <button
          onClick={handleGoogle}
          className="w-full rounded-lg border border-gray-600 bg-gray-700 py-2 font-medium text-white hover:bg-gray-600"
        >
          Continue with Google
        </button>

        <p className="mt-4 text-center text-sm text-gray-400">
          {mode === 'login' ? (
            <>No account? <a href="/signup" className="text-blue-400 hover:underline">Sign up</a></>
          ) : (
            <>Have an account? <a href="/login" className="text-blue-400 hover:underline">Sign in</a></>
          )}
        </p>
      </div>
    </div>
  );
}
