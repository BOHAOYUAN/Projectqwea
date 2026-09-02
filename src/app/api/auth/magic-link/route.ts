import { NextRequest, NextResponse } from 'next/server';
import { sendMagicLink } from '@/lib/server/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: unknown };
    const email = typeof body.email === 'string' ? body.email : '';
    const origin = request.nextUrl.origin;
    const result = await sendMagicLink(email, `${origin}/auth/callback?next=/dashboard`);

    if (result.ok) return NextResponse.json({ success: true });

    const messages = {
      'not-configured': 'Supabase is not configured yet. You can use the local demo dashboard for now.',
      'invalid-email': 'Please enter a valid email address.',
      'provider-error': 'We could not send the sign-in email. Please try again.',
    } as const;

    return NextResponse.json({ error: messages[result.reason] }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Unable to start sign-in right now.' }, { status: 500 });
  }
}
