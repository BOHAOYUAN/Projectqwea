'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Mail, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState('sending');
    setMessage('');

    try {
      const response = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Unable to send a sign-in email.');
      setState('sent');
      setMessage('Check your inbox for a secure sign-in link.');
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'Unable to send a sign-in email.');
    }
  }

  return (
    <main className="min-h-screen bg-[#f4e8d5] px-5 py-10 text-[#3f2b25] sm:grid sm:place-items-center">
      <section className="mx-auto w-full max-w-md rounded-[2rem] border border-[#ddc7af] bg-[#fffaf4] p-7 shadow-[0_24px_70px_rgba(91,61,47,0.16)] sm:p-10">
        <Link href="/r/ms-beauty/baltimore" className="inline-flex items-center gap-2 text-sm font-semibold text-[#805547] hover:text-[#5d382e]">
          <ArrowLeft className="h-4 w-4" />
          Back to customer page
        </Link>
        <div className="mt-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#9a6758] text-white shadow-sm">
          <Sparkles className="h-6 w-6" />
        </div>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.22em] text-[#9a6758]">Merchant operations</p>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight">Sign in to your workspace</h1>
        <p className="mt-3 text-sm leading-6 text-[#725d55]">We&apos;ll email you a secure magic link. No password or API key is stored in the browser.</p>

        <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-semibold">
            Work email
            <span className="mt-2 flex items-center gap-2 rounded-2xl border border-[#dec8b2] bg-white px-4 py-3 focus-within:border-[#9a6758] focus-within:ring-2 focus-within:ring-[#e8d1bb]">
              <Mail className="h-4 w-4 shrink-0 text-[#9a6758]" />
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@business.com"
                className="w-full bg-transparent text-sm outline-none placeholder:text-[#b9a69b]"
              />
            </span>
          </label>
          <button
            type="submit"
            disabled={state === 'sending'}
            className="flex w-full items-center justify-center rounded-2xl bg-[#9a6758] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#805547] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {state === 'sending' ? 'Sending secure link…' : 'Email me a sign-in link'}
          </button>
        </form>

        {message && (
          <p className={`mt-4 flex items-start gap-2 rounded-2xl px-4 py-3 text-sm ${state === 'sent' ? 'bg-[#edf4e8] text-[#3e6a38]' : 'bg-[#fff0ed] text-[#9c3d2d]'}`}>
            {state === 'sent' && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
            {message}
          </p>
        )}
      </section>
    </main>
  );
}
