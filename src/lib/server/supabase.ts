import { createServerClient } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

import type { AuthenticatedUser } from '@/lib/domain/types';

export interface SupabaseConfig {
  url: string;
  publishableKey: string;
}

export type MagicLinkResult =
  | { ok: true }
  | { ok: false; reason: 'not-configured' | 'invalid-email' | 'provider-error' };

let adminClient: SupabaseClient | null | undefined;

export function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  // Supabase now calls this a publishable key. Keep the anon-key alias so
  // existing Supabase projects can be configured without a code change.
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  return isConfiguredValue(url) && isConfiguredValue(publishableKey) ? { url, publishableKey } : null;
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfig() !== null;
}

/**
 * Server-only client for Route Handlers, Server Components, and Server
 * Actions. It is intentionally not imported by Client Components.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient | null> {
  const config = getSupabaseConfig();
  if (!config) return null;

  const cookieStore = await cookies();

  return createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot set cookies. Middleware/Route Handlers
          // refresh them when a session update is actually required.
        }
      },
    },
  });
}

/**
 * Privileged client for trusted server code only. It is null until a service
 * role key is deliberately configured and must never be sent to a browser.
 */
export function getSupabaseAdminClient(): SupabaseClient | null {
  if (adminClient !== undefined) return adminClient;

  const config = getSupabaseConfig();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!config || !serviceRoleKey) {
    adminClient = null;
    return adminClient;
  }

  adminClient = createClient(config.url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  return adminClient;
}

export async function getAuthenticatedSupabaseUser(): Promise<AuthenticatedUser | null> {
  const client = await createSupabaseServerClient();
  if (!client) return null;

  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error || !user) return null;

  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  const displayName = metadata?.full_name ?? metadata?.name;

  return {
    id: user.id,
    email: user.email ?? null,
    displayName: typeof displayName === 'string' ? displayName : null,
  };
}

export async function sendMagicLink(
  email: string,
  emailRedirectTo = `${getAppOrigin()}/auth/callback`
): Promise<MagicLinkResult> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!isPlausibleEmail(normalizedEmail)) {
    return { ok: false, reason: 'invalid-email' };
  }

  const client = await createSupabaseServerClient();
  if (!client) {
    return { ok: false, reason: 'not-configured' };
  }

  const { error } = await client.auth.signInWithOtp({
    email: normalizedEmail,
    options: { emailRedirectTo: getAllowedRedirectUrl(emailRedirectTo) },
  });

  return error ? { ok: false, reason: 'provider-error' } : { ok: true };
}

function getAppOrigin(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!configuredUrl) return 'http://localhost:3000';

  try {
    return new URL(configuredUrl).origin;
  } catch {
    return 'http://localhost:3000';
  }
}

function isPlausibleEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** Prevent request-controlled hosts from becoming magic-link redirect targets. */
function getAllowedRedirectUrl(value: string): string {
  const appOrigin = getAppOrigin();
  const fallback = `${appOrigin}/auth/callback`;

  try {
    const target = new URL(value);
    return target.origin === appOrigin ? target.toString() : fallback;
  } catch {
    return fallback;
  }
}

function isConfiguredValue(value: string | undefined): value is string {
  return Boolean(value && !/your[-_]|example|replace[-_]?me/i.test(value));
}
