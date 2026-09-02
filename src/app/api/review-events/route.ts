import { NextRequest, NextResponse } from 'next/server';
import { markGenerationMetricAction } from '@/lib/server/merchant-repository';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { metricId?: unknown; event?: unknown };
    const metricId = typeof body.metricId === 'string' ? body.metricId : '';
    const event = body.event === 'copied' || body.event === 'published' ? body.event : null;

    if (!metricId || !event) {
      return NextResponse.json({ error: 'Missing review event.' }, { status: 400 });
    }

    const updated = await markGenerationMetricAction(metricId, event === 'copied' ? 'copied' : 'published-click');
    // This endpoint is intentionally quiet when storage is disabled or the
    // metric has expired. The public customer experience must not depend on
    // analytics being available.
    return NextResponse.json({ success: true, stored: updated });
  } catch {
    return NextResponse.json({ error: 'Unable to record review event.' }, { status: 400 });
  }
}
