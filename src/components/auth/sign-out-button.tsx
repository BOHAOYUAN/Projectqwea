'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    await fetch('/api/auth/signout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      className="inline-flex items-center gap-1.5 rounded-xl border border-[#dec8b2] bg-white px-3 py-2 text-xs font-bold text-[#745246] transition hover:bg-[#fff7ef]"
    >
      <LogOut className="h-3.5 w-3.5" />
      Sign out
    </button>
  );
}
