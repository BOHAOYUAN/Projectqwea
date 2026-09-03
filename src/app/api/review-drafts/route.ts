import { NextRequest, NextResponse } from 'next/server';
import { CONTENT_VOICES, generateReviewDraft, type ContentVoice, type ReviewPlatform } from '@/lib/agent/review-generator';
import { getPublicReviewPage, recordAnonymousGenerationMetric } from '@/lib/server/merchant-repository';

interface DraftRequestBody {
  platform?: unknown;
  tags?: unknown;
  experience?: unknown;
  voice?: unknown;
  seed?: unknown;
  merchantSlug?: unknown;
  locationSlug?: unknown;
  serviceSlugs?: unknown;
}

const PUBLIC_GENERATION_WINDOW_MS = 10 * 60 * 1000;
const PUBLIC_GENERATION_LIMIT = 12;
const publicGenerationAttempts = new Map<string, { startedAt: number; count: number }>();

const PUBLIC_TAG_ALIASES: Record<string, string[]> = {
  'Relaxing atmosphere': ['放松舒服'],
  'Thoughtful service': ['细心专业'],
  'Clean space': ['环境整洁'],
  'Unhurried visit': ['节奏不赶'],
  'Professional care': ['专业细致'],
  'Friendly service': ['服务亲切'],
};

function asStringArray(value: unknown, maximum: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maximum);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as DraftRequestBody;
    const platform: ReviewPlatform | null =
      body.platform === 'google' || body.platform === 'xiaohongshu' || body.platform === 'yelp' || body.platform === 'instagram'
        ? body.platform
        : null;
    const voice: ContentVoice = typeof body.voice === 'string' && CONTENT_VOICES.includes(body.voice as ContentVoice)
      ? body.voice as ContentVoice
      : 'natural';
    const experience = typeof body.experience === 'string' ? body.experience.trim().slice(0, 900) : '';
    const serviceSlugs = asStringArray(body.serviceSlugs, 3);
    const tags = asStringArray(body.tags, 8);
    const seed = typeof body.seed === 'number' && Number.isFinite(body.seed) ? body.seed : Date.now();
    const merchantSlug = typeof body.merchantSlug === 'string' ? body.merchantSlug.trim() : '';
    const locationSlug = typeof body.locationSlug === 'string' ? body.locationSlug.trim() : '';

    if (!platform || !merchantSlug || !locationSlug) {
      return NextResponse.json({ error: 'A valid public page and platform are required.' }, { status: 400 });
    }

    // Resolve anonymous requests against the published route again. This
    // removes arbitrary-brand prompt usage and blocks disabled platforms from
    // being used as a public model proxy.
    const publicPage = await getPublicReviewPage(merchantSlug, locationSlug);
    if (!publicPage) {
      return NextResponse.json({ error: 'This public review page is unavailable.' }, { status: 404 });
    }
    if (!publicPage.platforms.some((item) => item.platform === platform)) {
      return NextResponse.json({ error: 'This review platform is not available for this location.' }, { status: 404 });
    }

    if (!consumePublicGenerationQuota(request, merchantSlug, locationSlug)) {
      return NextResponse.json(
        { error: 'Please wait a few minutes before creating more drafts.' },
        { status: 429 }
      );
    }

    const safeMerchantName = publicPage.merchant.name;
    const safeLocation = [publicPage.location.city, publicPage.location.region].filter(Boolean).join(', ') || publicPage.location.name;
    const serviceBySlug = new Map(publicPage.services.map((service) => [service.slug, service]));
    const safeServiceNames = serviceSlugs
      .map((slug) => {
        const service = serviceBySlug.get(slug);
        return platform === 'xiaohongshu' ? service?.nameZh : service?.nameEn;
      })
      .filter((name): name is string => Boolean(name));
    const safeTags = resolvePublicTags(tags, publicPage.suggestedTags);

    if (!experience && safeServiceNames.length === 0 && safeTags.length === 0) {
      return NextResponse.json(
        { error: 'Share a short experience, select a service, or choose a feeling first.' },
        { status: 400 }
      );
    }

    const draft = await generateReviewDraft({
      platform,
      merchantName: safeMerchantName,
      location: safeLocation,
      serviceNames: safeServiceNames,
      tags: safeTags,
      experience,
      voice,
      seed,
    });

    const metricId = await recordAnonymousGenerationMetric({
      merchantSlug,
      locationSlug,
      platform,
      provider: draft.mode,
      serviceSlug: serviceSlugs[0],
      selectedTags: safeTags,
    });

    return NextResponse.json({ success: true, draft, metricId });
  } catch {
    return NextResponse.json({ error: 'Unable to create a draft right now.' }, { status: 500 });
  }
}

function resolvePublicTags(requestedTags: string[], suggestedTags: string[]): string[] {
  const allowed = new Set(suggestedTags);
  for (const tag of suggestedTags) {
    for (const alias of PUBLIC_TAG_ALIASES[tag] ?? []) allowed.add(alias);
  }
  return requestedTags.filter((tag) => allowed.has(tag)).slice(0, 8);
}

/**
 * A small best-effort guard for the anonymous public endpoint. The published
 * page check remains the access control; this only prevents a single browser
 * from rapidly consuming model capacity before a shared rate-limit service is
 * introduced.
 */
function consumePublicGenerationQuota(request: NextRequest, merchantSlug: string, locationSlug: string): boolean {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const clientKey = forwarded || request.headers.get('x-real-ip') || 'anonymous';
  const key = `${clientKey}:${merchantSlug}:${locationSlug}`;
  const now = Date.now();
  const existing = publicGenerationAttempts.get(key);

  if (!existing || now - existing.startedAt >= PUBLIC_GENERATION_WINDOW_MS) {
    publicGenerationAttempts.set(key, { startedAt: now, count: 1 });
    return true;
  }
  if (existing.count >= PUBLIC_GENERATION_LIMIT) return false;

  existing.count += 1;
  publicGenerationAttempts.set(key, existing);
  return true;
}
