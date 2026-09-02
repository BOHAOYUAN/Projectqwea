import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/server/supabase';

export async function POST(request: Request) {
  const client = await createSupabaseServerClient();
  if (client) await client.auth.signOut();
  return NextResponse.json({ success: true, redirectTo: new URL('/login', request.url).toString() });
}
