import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/server/supabase';
import { upsertAppUser } from '@/lib/server/merchant-repository';

function safeNextPath(value: string | null): string {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/dashboard';
}

export async function GET(request: NextRequest) {
  const nextPath = safeNextPath(request.nextUrl.searchParams.get('next'));
  const code = request.nextUrl.searchParams.get('code');
  const destination = new URL(nextPath, request.url);

  if (!code) {
    destination.pathname = '/login';
    destination.searchParams.set('error', 'missing-code');
    return NextResponse.redirect(destination);
  }

  const client = await createSupabaseServerClient();
  if (!client) {
    destination.pathname = '/login';
    destination.searchParams.set('error', 'not-configured');
    return NextResponse.redirect(destination);
  }

  const { error } = await client.auth.exchangeCodeForSession(code);
  if (error) {
    destination.pathname = '/login';
    destination.searchParams.set('error', 'exchange-failed');
  } else {
    const {
      data: { user },
    } = await client.auth.getUser();
    if (user) {
      const metadata = user.user_metadata as Record<string, unknown> | undefined;
      const displayName = metadata?.full_name ?? metadata?.name;
      // This is an optional mirror of the verified Supabase Auth identity.
      // It intentionally grants no merchant access; that remains a separate
      // Membership decision in the database.
      try {
        await upsertAppUser({
          id: user.id,
          email: user.email ?? null,
          displayName: typeof displayName === 'string' ? displayName : null,
        });
      } catch {
        // A missing migration must not turn a valid magic-link session into a
        // failed sign-in. Dashboard data access still enforces Membership.
      }
    }
  }

  return NextResponse.redirect(destination);
}
