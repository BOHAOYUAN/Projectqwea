import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getAuthenticatedSupabaseUser, isSupabaseConfigured } from '@/lib/server/supabase';

// Auth configuration may be present only in the deployed environment. Keep
// this route request-time so a build made without local Supabase credentials
// cannot accidentally turn the dashboard into a cached public page.
export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  if (isSupabaseConfigured()) {
    const user = await getAuthenticatedSupabaseUser();
    if (!user) redirect('/login');
  }

  return children;
}
