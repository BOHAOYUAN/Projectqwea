import { MerchantStatus, Platform, Prisma, PrismaClient, ReviewSource } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import type { AuthenticatedUser, MembershipRole } from '@/lib/domain/types';
import {
  getMerchantAccess,
  listMerchantAccess,
  upsertAppUser,
} from '@/lib/server/merchant-repository';
import { getPrismaClient } from '@/lib/server/prisma';
import { getAuthenticatedSupabaseUser } from '@/lib/server/supabase';

type JsonRecord = Record<string, unknown>;

interface SessionContext {
  client: PrismaClient;
  user: AuthenticatedUser;
}

/**
 * The dashboard is intentionally backed by one authenticated, membership-
 * scoped API. Public customer pages never use this route. Keeping the
 * authorization boundary here prevents a client-side merchant switcher from
 * turning into a cross-tenant data leak.
 */
export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const requestedSlug = request.nextUrl.searchParams.get('merchant')?.trim() || '';
  const memberships = await listMerchantAccess(session.user.id);
  const active = requestedSlug
    ? memberships.find((membership) => membership.merchantSlug === requestedSlug)
    : memberships[0];

  if (requestedSlug && !active) {
    return NextResponse.json({ error: 'You do not have access to this merchant.' }, { status: 403 });
  }

  if (!active) {
    return NextResponse.json({
      user: safeUser(session.user),
      merchants: [],
      activeMerchant: null,
      message: 'No merchant workspace has been assigned to this account yet.',
    });
  }

  const merchant = await session.client.merchant.findFirst({
    where: { id: active.merchantId },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      industryTags: true,
      logoUrl: true,
      websiteUrl: true,
      phone: true,
      brandColor: true,
      defaultLocale: true,
      status: true,
      locations: {
        orderBy: { name: 'asc' },
        select: {
          id: true,
          slug: true,
          name: true,
          addressLine1: true,
          addressLine2: true,
          city: true,
          region: true,
          postalCode: true,
          countryCode: true,
          timezone: true,
          phone: true,
          openingHours: true,
          isActive: true,
          services: {
            orderBy: { displayOrder: 'asc' },
            select: {
              id: true,
              slug: true,
              nameEn: true,
              nameZh: true,
              description: true,
              imageUrl: true,
              displayOrder: true,
              isActive: true,
            },
          },
          platformLinks: {
            orderBy: { platform: 'asc' },
            select: {
              id: true,
              platform: true,
              destinationUrl: true,
              fallbackUrl: true,
              ctaLabel: true,
              publishHint: true,
              isEnabled: true,
            },
          },
          publicPage: {
            select: {
              isPublished: true,
              headline: true,
              subheadline: true,
              heroImageUrl: true,
              backgroundImageUrl: true,
              accentColor: true,
              showAddress: true,
              showServices: true,
              reviewDisclosure: true,
              xiaohongshuQuery: true,
            },
          },
          contentPreference: {
            select: {
              suggestedTags: true,
              googleTone: true,
              xiaohongshuTone: true,
              forbiddenClaims: true,
            },
          },
          _count: { select: { generationMetrics: true, reviews: true, replyDrafts: true } },
        },
      },
    },
  });

  if (!merchant) {
    return NextResponse.json({ error: 'Merchant workspace was not found.' }, { status: 404 });
  }

  const [metricGroups, funnelMetrics, reviews, replyDrafts] = await Promise.all([
    session.client.generationMetric.groupBy({
      by: ['platform', 'provider'],
      where: { merchantId: merchant.id },
      _count: { _all: true },
    }),
    // GenerationMetric deliberately contains no customer copy. Fetch only
    // anonymous conversion flags so the dashboard can show durable,
    // cross-device funnel counts for each location and platform.
    session.client.generationMetric.findMany({
      where: { merchantId: merchant.id },
      select: {
        locationId: true,
        platform: true,
        wasCopied: true,
        wasPublishedClick: true,
      },
    }),
    session.client.managedReview.findMany({
      where: { merchantId: merchant.id },
      orderBy: { reviewedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        locationId: true,
        platform: true,
        source: true,
        reviewerAlias: true,
        rating: true,
        reviewText: true,
        reviewedAt: true,
      },
    }),
    session.client.reviewReplyDraft.findMany({
      where: { merchantId: merchant.id },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        locationId: true,
        reviewId: true,
        sourcePlatform: true,
        rating: true,
        reviewExcerpt: true,
        summary: true,
        draftText: true,
        status: true,
        updatedAt: true,
      },
    }),
  ]);

  const funnelByLocation = funnelMetrics.reduce<
    Map<string, Record<string, { generated: number; copied: number; opened: number }>>
  >((locations, metric) => {
    const platform = metric.platform.toLowerCase();
    const location = locations.get(metric.locationId) ?? {};
    const counts = location[platform] ?? { generated: 0, copied: 0, opened: 0 };

    counts.generated += 1;
    if (metric.wasCopied) counts.copied += 1;
    if (metric.wasPublishedClick) counts.opened += 1;

    location[platform] = counts;
    locations.set(metric.locationId, location);
    return locations;
  }, new Map());

  return NextResponse.json({
    user: safeUser(session.user),
    merchants: memberships,
    activeMerchant: {
      ...merchant,
      status: merchant.status.toLowerCase(),
      locations: merchant.locations.map((location) => ({
        ...location,
        generationFunnel: funnelByLocation.get(location.id) ?? {},
        platformLinks: location.platformLinks.map((link) => ({
          ...link,
          platform: link.platform.toLowerCase(),
        })),
      })),
      generationSummary: metricGroups.map((group) => ({
        platform: group.platform.toLowerCase(),
        provider: group.provider.toLowerCase(),
        count: group._count._all,
      })),
      reviews: reviews.map((review) => ({
        ...review,
        platform: review.platform.toLowerCase(),
        source: review.source.toLowerCase(),
      })),
      replyDrafts: replyDrafts.map((draft) => ({
        ...draft,
        sourcePlatform: draft.sourcePlatform.toLowerCase(),
        status: draft.status.toLowerCase(),
      })),
    },
  });
}

/** Create a merchant, location, service, or explicitly manual review. */
export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const body = await readJson(request);
  if (!body) return invalidRequest();
  const kind = text(body.kind);
  const data = record(body.data);
  if (!data) return invalidRequest();

  if (kind === 'merchant') {
    return createMerchant(session, data);
  }

  const merchantSlug = text(body.merchantSlug);
  if (!merchantSlug) return NextResponse.json({ error: 'Merchant is required.' }, { status: 400 });
  const access = await getMerchantAccess(session.user.id, merchantSlug);
  if (!access) return NextResponse.json({ error: 'You do not have access to this merchant.' }, { status: 403 });
  if (!canEdit(access.role)) return NextResponse.json({ error: 'Your role cannot edit this workspace.' }, { status: 403 });

  if (kind === 'location') return createLocation(session.client, access.merchantId, data);
  if (kind === 'service') return createService(session.client, access.merchantId, data);
  if (kind === 'review') return createManualReview(session.client, access.merchantId, data);

  return NextResponse.json({ error: 'Unsupported create action.' }, { status: 400 });
}

/** Update merchant configuration, a location, service, platform link, or copy settings. */
export async function PATCH(request: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const body = await readJson(request);
  if (!body) return invalidRequest();
  const kind = text(body.kind);
  const merchantSlug = text(body.merchantSlug);
  const data = record(body.data);
  if (!kind || !merchantSlug || !data) return invalidRequest();

  const access = await getMerchantAccess(session.user.id, merchantSlug);
  if (!access) return NextResponse.json({ error: 'You do not have access to this merchant.' }, { status: 403 });
  if (!canEdit(access.role)) return NextResponse.json({ error: 'Your role cannot edit this workspace.' }, { status: 403 });

  if (kind === 'merchant') {
    if (!canManageMerchant(access.role)) {
      return NextResponse.json({ error: 'Only an owner or admin can change merchant settings.' }, { status: 403 });
    }
    return updateMerchant(session.client, access.merchantId, data);
  }

  const locationId = text(body.locationId);
  if (!locationId || !(await belongsToMerchant(session.client, locationId, access.merchantId))) {
    return NextResponse.json({ error: 'Location was not found in this merchant.' }, { status: 404 });
  }

  if (kind === 'location') return updateLocation(session.client, access.merchantId, locationId, data);
  if (kind === 'service') return updateService(session.client, access.merchantId, locationId, text(body.id), data);
  if (kind === 'platform') return updatePlatformLink(session.client, locationId, data);
  if (kind === 'publicPage') return updatePublicPage(session.client, access.merchantId, locationId, data);
  if (kind === 'contentPreference') return updateContentPreference(session.client, locationId, data);
  if (kind === 'review') return updateManualReview(session.client, access.merchantId, locationId, text(body.id), data);

  return NextResponse.json({ error: 'Unsupported update action.' }, { status: 400 });
}

async function requireSession(): Promise<SessionContext | NextResponse> {
  const client = getPrismaClient();
  if (!client) {
    return NextResponse.json(
      { error: 'Persistent storage is not configured. Add Supabase and PostgreSQL variables first.' },
      { status: 503 }
    );
  }

  const user = await getAuthenticatedSupabaseUser();
  if (!user) return NextResponse.json({ error: 'Sign in is required.' }, { status: 401 });

  await upsertAppUser(user);
  await grantConfiguredInitialOwner(client, user);
  return { client, user };
}

async function grantConfiguredInitialOwner(client: PrismaClient, user: AuthenticatedUser): Promise<void> {
  const configuredEmail = process.env.INITIAL_OWNER_EMAIL?.trim().toLowerCase();
  if (!configuredEmail || user.email?.toLowerCase() !== configuredEmail) return;

  const merchant = await client.merchant.findUnique({ where: { slug: 'ms-beauty' }, select: { id: true } });
  if (!merchant) return;

  await client.membership.upsert({
    where: { userId_merchantId: { userId: user.id, merchantId: merchant.id } },
    update: { role: 'OWNER' },
    create: { userId: user.id, merchantId: merchant.id, role: 'OWNER' },
  });
}

async function createMerchant(session: SessionContext, data: JsonRecord) {
  const name = limitedText(data.name, 120);
  const addressLine1 = limitedText(data.addressLine1, 180);
  if (!name || !addressLine1) {
    return NextResponse.json({ error: 'Merchant name and first location address are required.' }, { status: 400 });
  }

  const slug = await availableMerchantSlug(session.client, text(data.slug) || name);
  const locationName = limitedText(data.locationName, 120) || `${name} · Main location`;
  const locationSlug = await availableLocationSlug(session.client, '', text(data.locationSlug) || locationName);
  const isPublished = data.isPublished === true;
  const merchant = await session.client.merchant.create({
    data: {
      slug,
      name,
      description: nullableText(data.description, 900),
      industryTags: textArray(data.industryTags, 12, 80),
      websiteUrl: safeWebUrl(data.websiteUrl),
      phone: nullableText(data.phone, 80),
      brandColor: nullableText(data.brandColor, 32),
      // A merchant becomes publicly active only when its first location is
      // explicitly published. Draft merchants remain private by default.
      status: isPublished ? MerchantStatus.ACTIVE : MerchantStatus.DRAFT,
      memberships: { create: { userId: session.user.id, role: 'OWNER' } },
      locations: {
        create: {
          slug: locationSlug,
          name: locationName,
          addressLine1,
          city: nullableText(data.city, 100),
          region: nullableText(data.region, 100),
          postalCode: nullableText(data.postalCode, 24),
          countryCode: limitedText(data.countryCode, 2)?.toUpperCase() || 'US',
          timezone: limitedText(data.timezone, 64) || 'America/New_York',
          openingHours: nullableText(data.openingHours, 500),
          publicPage: { create: { isPublished, accentColor: nullableText(data.brandColor, 32) } },
          contentPreference: { create: { suggestedTags: [] } },
        },
      },
    },
    select: { id: true, slug: true, name: true },
  });

  return NextResponse.json({ success: true, merchant });
}

async function createLocation(client: PrismaClient, merchantId: string, data: JsonRecord) {
  const name = limitedText(data.name, 120);
  const addressLine1 = limitedText(data.addressLine1, 180);
  if (!name || !addressLine1) {
    return NextResponse.json({ error: 'Location name and address are required.' }, { status: 400 });
  }

  const slug = await availableLocationSlug(client, merchantId, text(data.slug) || name);
  const isPublished = data.isPublished === true;
  const location = await client.location.create({
    data: {
      merchantId,
      slug,
      name,
      addressLine1,
      addressLine2: nullableText(data.addressLine2, 180),
      city: nullableText(data.city, 100),
      region: nullableText(data.region, 100),
      postalCode: nullableText(data.postalCode, 24),
      countryCode: limitedText(data.countryCode, 2)?.toUpperCase() || 'US',
      timezone: limitedText(data.timezone, 64) || 'America/New_York',
      phone: nullableText(data.phone, 80),
      openingHours: nullableText(data.openingHours, 500),
      publicPage: { create: { isPublished } },
      contentPreference: { create: { suggestedTags: [] } },
    },
    select: { id: true, slug: true, name: true },
  });
  if (isPublished) {
    await client.merchant.update({ where: { id: merchantId }, data: { status: MerchantStatus.ACTIVE } });
  }
  return NextResponse.json({ success: true, location });
}

async function createService(client: PrismaClient, merchantId: string, data: JsonRecord) {
  const locationId = text(data.locationId);
  if (!locationId || !(await belongsToMerchant(client, locationId, merchantId))) {
    return NextResponse.json({ error: 'Choose a location in this merchant first.' }, { status: 400 });
  }
  const nameEn = limitedText(data.nameEn, 120);
  const nameZh = limitedText(data.nameZh, 120);
  if (!nameEn || !nameZh) {
    return NextResponse.json({ error: 'Both English and Chinese service names are required.' }, { status: 400 });
  }
  const slug = await availableServiceSlug(client, locationId, text(data.slug) || nameEn);
  const last = await client.service.aggregate({ where: { locationId }, _max: { displayOrder: true } });
  const service = await client.service.create({
    data: {
      locationId,
      slug,
      nameEn,
      nameZh,
      description: nullableText(data.description, 500),
      imageUrl: safeWebUrl(data.imageUrl),
      displayOrder: (last._max.displayOrder ?? -1) + 1,
      isActive: true,
    },
    select: { id: true, slug: true, nameEn: true, nameZh: true },
  });
  return NextResponse.json({ success: true, service });
}

async function createManualReview(client: PrismaClient, merchantId: string, data: JsonRecord) {
  const locationId = text(data.locationId);
  const platform = platformValue(data.platform);
  const reviewText = limitedText(data.reviewText, 5000);
  if (!locationId || !(await belongsToMerchant(client, locationId, merchantId)) || !platform || !reviewText) {
    return NextResponse.json({ error: 'Location, platform, and review text are required.' }, { status: 400 });
  }
  const review = await client.managedReview.create({
    data: {
      merchantId,
      locationId,
      platform,
      source: ReviewSource.MANUAL,
      reviewerAlias: nullableText(data.reviewerAlias, 160),
      rating: ratingValue(data.rating),
      reviewText,
      reviewedAt: dateValue(data.reviewedAt),
    },
    select: { id: true },
  });
  return NextResponse.json({ success: true, review });
}

async function updateMerchant(client: PrismaClient, merchantId: string, data: JsonRecord) {
  const changes: Prisma.MerchantUpdateInput = {};
  if (has(data, 'name')) changes.name = limitedText(data.name, 120) || undefined;
  if (has(data, 'description')) changes.description = nullableText(data.description, 900);
  if (has(data, 'industryTags')) changes.industryTags = textArray(data.industryTags, 12, 80);
  if (has(data, 'logoUrl')) changes.logoUrl = safeWebUrl(data.logoUrl);
  if (has(data, 'websiteUrl')) changes.websiteUrl = safeWebUrl(data.websiteUrl);
  if (has(data, 'phone')) changes.phone = nullableText(data.phone, 80);
  if (has(data, 'brandColor')) changes.brandColor = nullableText(data.brandColor, 32);
  if (has(data, 'defaultLocale')) changes.defaultLocale = limitedText(data.defaultLocale, 16) || undefined;
  if (has(data, 'status')) {
    const status = merchantStatus(data.status);
    if (!status) return NextResponse.json({ error: 'Invalid merchant status.' }, { status: 400 });
    changes.status = status;
  }
  if (Object.keys(changes).length === 0) return NextResponse.json({ error: 'No valid merchant fields supplied.' }, { status: 400 });

  const merchant = await client.merchant.update({
    where: { id: merchantId },
    data: changes,
    select: { id: true, slug: true, name: true, status: true },
  });
  return NextResponse.json({ success: true, merchant: { ...merchant, status: merchant.status.toLowerCase() } });
}

async function updateLocation(client: PrismaClient, merchantId: string, locationId: string, data: JsonRecord) {
  const changes: Prisma.LocationUpdateInput = {};
  if (has(data, 'slug')) {
    const slug = slugify(text(data.slug), 'location');
    const conflict = await client.location.findFirst({
      where: { merchantId, slug, NOT: { id: locationId } },
      select: { id: true },
    });
    if (conflict) {
      return NextResponse.json({ error: 'Another location in this merchant already uses that public slug.' }, { status: 409 });
    }
    changes.slug = slug;
  }
  if (has(data, 'name')) changes.name = limitedText(data.name, 120) || undefined;
  if (has(data, 'addressLine1')) changes.addressLine1 = limitedText(data.addressLine1, 180) || undefined;
  if (has(data, 'addressLine2')) changes.addressLine2 = nullableText(data.addressLine2, 180);
  if (has(data, 'city')) changes.city = nullableText(data.city, 100);
  if (has(data, 'region')) changes.region = nullableText(data.region, 100);
  if (has(data, 'postalCode')) changes.postalCode = nullableText(data.postalCode, 24);
  if (has(data, 'countryCode')) changes.countryCode = limitedText(data.countryCode, 2)?.toUpperCase() || undefined;
  if (has(data, 'timezone')) changes.timezone = limitedText(data.timezone, 64) || undefined;
  if (has(data, 'phone')) changes.phone = nullableText(data.phone, 80);
  if (has(data, 'openingHours')) changes.openingHours = nullableText(data.openingHours, 500);
  if (has(data, 'isActive') && typeof data.isActive === 'boolean') changes.isActive = data.isActive;
  if (Object.keys(changes).length === 0) return NextResponse.json({ error: 'No valid location fields supplied.' }, { status: 400 });

  const location = await client.location.update({
    where: { id: locationId },
    data: changes,
    select: { id: true, slug: true, name: true, isActive: true },
  });
  return NextResponse.json({ success: true, location });
}

async function updateService(
  client: PrismaClient,
  merchantId: string,
  locationId: string,
  serviceId: string,
  data: JsonRecord
) {
  if (!serviceId) return NextResponse.json({ error: 'Service is required.' }, { status: 400 });
  const service = await client.service.findFirst({ where: { id: serviceId, locationId, location: { merchantId } }, select: { id: true } });
  if (!service) return NextResponse.json({ error: 'Service was not found.' }, { status: 404 });
  const changes: Prisma.ServiceUpdateInput = {};
  if (has(data, 'nameEn')) changes.nameEn = limitedText(data.nameEn, 120) || undefined;
  if (has(data, 'nameZh')) changes.nameZh = limitedText(data.nameZh, 120) || undefined;
  if (has(data, 'description')) changes.description = nullableText(data.description, 500);
  if (has(data, 'imageUrl')) changes.imageUrl = safeWebUrl(data.imageUrl);
  if (has(data, 'displayOrder') && Number.isInteger(data.displayOrder)) changes.displayOrder = Number(data.displayOrder);
  if (has(data, 'isActive') && typeof data.isActive === 'boolean') changes.isActive = data.isActive;
  if (Object.keys(changes).length === 0) return NextResponse.json({ error: 'No valid service fields supplied.' }, { status: 400 });
  const updated = await client.service.update({ where: { id: serviceId }, data: changes, select: { id: true, slug: true, isActive: true } });
  return NextResponse.json({ success: true, service: updated });
}

async function updatePlatformLink(client: PrismaClient, locationId: string, data: JsonRecord) {
  const platform = platformValue(data.platform);
  if (!platform) return NextResponse.json({ error: 'Choose a supported platform.' }, { status: 400 });
  const existing = await client.platformLink.findUnique({ where: { locationId_platform: { locationId, platform } } });
  if (has(data, 'destinationUrl') && text(data.destinationUrl) && !safePlatformUrl(data.destinationUrl, platform)) {
    return NextResponse.json({ error: directLinkHelp(platform) }, { status: 400 });
  }
  if (has(data, 'fallbackUrl') && text(data.fallbackUrl) && !safePlatformUrl(data.fallbackUrl, platform)) {
    return NextResponse.json({ error: directLinkHelp(platform) }, { status: 400 });
  }
  const destinationUrl = has(data, 'destinationUrl') ? safePlatformUrl(data.destinationUrl, platform) : existing?.destinationUrl ?? null;
  const fallbackUrl = has(data, 'fallbackUrl') ? safePlatformUrl(data.fallbackUrl, platform) : existing?.fallbackUrl ?? null;
  const isEnabled = has(data, 'isEnabled') && typeof data.isEnabled === 'boolean' ? data.isEnabled : existing?.isEnabled ?? false;
  if (isEnabled && !destinationUrl && !fallbackUrl) {
    return NextResponse.json({ error: 'Add a real platform URL before enabling this entry.' }, { status: 400 });
  }

  const link = await client.platformLink.upsert({
    where: { locationId_platform: { locationId, platform } },
    update: {
      destinationUrl,
      fallbackUrl,
      isEnabled,
      ctaLabel: has(data, 'ctaLabel') ? nullableText(data.ctaLabel, 120) : existing?.ctaLabel ?? null,
      publishHint: has(data, 'publishHint') ? nullableText(data.publishHint, 500) : existing?.publishHint ?? null,
    },
    create: {
      locationId,
      platform,
      destinationUrl,
      fallbackUrl,
      isEnabled,
      ctaLabel: nullableText(data.ctaLabel, 120),
      publishHint: nullableText(data.publishHint, 500),
    },
    select: { id: true, platform: true, destinationUrl: true, fallbackUrl: true, isEnabled: true },
  });
  return NextResponse.json({ success: true, platformLink: { ...link, platform: link.platform.toLowerCase() } });
}

async function updatePublicPage(client: PrismaClient, merchantId: string, locationId: string, data: JsonRecord) {
  const existing = await client.publicPageConfig.findUnique({ where: { locationId } });
  const page = await client.publicPageConfig.upsert({
    where: { locationId },
    update: {
      isPublished: has(data, 'isPublished') && typeof data.isPublished === 'boolean' ? data.isPublished : existing?.isPublished ?? false,
      headline: has(data, 'headline') ? nullableText(data.headline, 180) : existing?.headline ?? null,
      subheadline: has(data, 'subheadline') ? nullableText(data.subheadline, 300) : existing?.subheadline ?? null,
      heroImageUrl: has(data, 'heroImageUrl') ? safeWebUrl(data.heroImageUrl) : existing?.heroImageUrl ?? null,
      backgroundImageUrl: has(data, 'backgroundImageUrl') ? safeWebUrl(data.backgroundImageUrl) : existing?.backgroundImageUrl ?? null,
      accentColor: has(data, 'accentColor') ? nullableText(data.accentColor, 32) : existing?.accentColor ?? null,
      showAddress: has(data, 'showAddress') && typeof data.showAddress === 'boolean' ? data.showAddress : existing?.showAddress ?? true,
      showServices: has(data, 'showServices') && typeof data.showServices === 'boolean' ? data.showServices : existing?.showServices ?? true,
      reviewDisclosure: has(data, 'reviewDisclosure') ? nullableText(data.reviewDisclosure, 500) : existing?.reviewDisclosure ?? null,
      xiaohongshuQuery: has(data, 'xiaohongshuQuery') ? nullableText(data.xiaohongshuQuery, 160) : existing?.xiaohongshuQuery ?? null,
    },
    create: {
      locationId,
      isPublished: typeof data.isPublished === 'boolean' ? data.isPublished : false,
      headline: nullableText(data.headline, 180),
      subheadline: nullableText(data.subheadline, 300),
      heroImageUrl: safeWebUrl(data.heroImageUrl),
      backgroundImageUrl: safeWebUrl(data.backgroundImageUrl),
      accentColor: nullableText(data.accentColor, 32),
      showAddress: typeof data.showAddress === 'boolean' ? data.showAddress : true,
      showServices: typeof data.showServices === 'boolean' ? data.showServices : true,
      reviewDisclosure: nullableText(data.reviewDisclosure, 500),
      xiaohongshuQuery: nullableText(data.xiaohongshuQuery, 160),
    },
    select: { id: true, isPublished: true },
  });
  if (page.isPublished) {
    await client.merchant.update({ where: { id: merchantId }, data: { status: MerchantStatus.ACTIVE } });
  }
  return NextResponse.json({ success: true, publicPage: page });
}

async function updateContentPreference(client: PrismaClient, locationId: string, data: JsonRecord) {
  const existing = await client.contentPreference.findUnique({ where: { locationId } });
  const preference = await client.contentPreference.upsert({
    where: { locationId },
    update: {
      suggestedTags: has(data, 'suggestedTags') ? textArray(data.suggestedTags, 12, 80) : existing?.suggestedTags ?? [],
      googleTone: has(data, 'googleTone') ? nullableText(data.googleTone, 240) : existing?.googleTone ?? null,
      xiaohongshuTone: has(data, 'xiaohongshuTone') ? nullableText(data.xiaohongshuTone, 240) : existing?.xiaohongshuTone ?? null,
      forbiddenClaims: has(data, 'forbiddenClaims') ? textArray(data.forbiddenClaims, 20, 120) : existing?.forbiddenClaims ?? [],
    },
    create: {
      locationId,
      suggestedTags: textArray(data.suggestedTags, 12, 80),
      googleTone: nullableText(data.googleTone, 240),
      xiaohongshuTone: nullableText(data.xiaohongshuTone, 240),
      forbiddenClaims: textArray(data.forbiddenClaims, 20, 120),
    },
    select: { id: true, suggestedTags: true, googleTone: true, xiaohongshuTone: true, forbiddenClaims: true },
  });
  return NextResponse.json({ success: true, contentPreference: preference });
}

async function updateManualReview(
  client: PrismaClient,
  merchantId: string,
  locationId: string,
  reviewId: string,
  data: JsonRecord
) {
  if (!reviewId) return NextResponse.json({ error: 'Review is required.' }, { status: 400 });
  const review = await client.managedReview.findFirst({ where: { id: reviewId, merchantId, locationId }, select: { id: true } });
  if (!review) return NextResponse.json({ error: 'Review was not found.' }, { status: 404 });
  const changes: Prisma.ManagedReviewUpdateInput = {};
  if (has(data, 'reviewerAlias')) changes.reviewerAlias = nullableText(data.reviewerAlias, 160);
  if (has(data, 'rating')) changes.rating = ratingValue(data.rating);
  if (has(data, 'reviewText')) changes.reviewText = limitedText(data.reviewText, 5000) || undefined;
  if (has(data, 'reviewedAt')) changes.reviewedAt = dateValue(data.reviewedAt);
  if (Object.keys(changes).length === 0) return NextResponse.json({ error: 'No valid review fields supplied.' }, { status: 400 });
  await client.managedReview.update({ where: { id: reviewId }, data: changes });
  return NextResponse.json({ success: true });
}

async function belongsToMerchant(client: PrismaClient, locationId: string, merchantId: string): Promise<boolean> {
  const location = await client.location.findFirst({ where: { id: locationId, merchantId }, select: { id: true } });
  return Boolean(location);
}

async function availableMerchantSlug(client: PrismaClient, source: string): Promise<string> {
  const base = slugify(source, 'merchant');
  for (let suffix = 0; suffix < 50; suffix += 1) {
    const slug = suffix === 0 ? base : `${base}-${suffix + 1}`;
    if (!(await client.merchant.findUnique({ where: { slug }, select: { id: true } }))) return slug;
  }
  return `${base}-${Date.now().toString(36)}`.slice(0, 96);
}

async function availableLocationSlug(client: PrismaClient, merchantId: string, source: string): Promise<string> {
  const base = slugify(source, 'location');
  for (let suffix = 0; suffix < 50; suffix += 1) {
    const slug = suffix === 0 ? base : `${base}-${suffix + 1}`;
    const existing = merchantId
      ? await client.location.findUnique({ where: { merchantId_slug: { merchantId, slug } }, select: { id: true } })
      : null;
    if (!existing) return slug;
  }
  return `${base}-${Date.now().toString(36)}`.slice(0, 96);
}

async function availableServiceSlug(client: PrismaClient, locationId: string, source: string): Promise<string> {
  const base = slugify(source, 'service');
  for (let suffix = 0; suffix < 50; suffix += 1) {
    const slug = suffix === 0 ? base : `${base}-${suffix + 1}`;
    if (!(await client.service.findUnique({ where: { locationId_slug: { locationId, slug } }, select: { id: true } }))) return slug;
  }
  return `${base}-${Date.now().toString(36)}`.slice(0, 96);
}

function canEdit(role: MembershipRole): boolean {
  return role === 'owner' || role === 'admin' || role === 'editor';
}

function canManageMerchant(role: MembershipRole): boolean {
  return role === 'owner' || role === 'admin';
}

function safeUser(user: AuthenticatedUser) {
  return { email: user.email, displayName: user.displayName };
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function limitedText(value: unknown, max: number): string {
  return text(value).slice(0, max);
}

function nullableText(value: unknown, max: number): string | null {
  return limitedText(value, max) || null;
}

function textArray(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().slice(0, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function record(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : null;
}

function has(recordValue: JsonRecord, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(recordValue, key);
}

function platformValue(value: unknown): Platform | null {
  if (value === 'google' || value === 'GOOGLE') return Platform.GOOGLE;
  if (value === 'xiaohongshu' || value === 'XIAOHONGSHU') return Platform.XIAOHONGSHU;
  if (value === 'yelp' || value === 'YELP') return Platform.YELP;
  if (value === 'instagram' || value === 'INSTAGRAM') return Platform.INSTAGRAM;
  return null;
}

function merchantStatus(value: unknown): MerchantStatus | null {
  if (value === 'draft' || value === 'DRAFT') return MerchantStatus.DRAFT;
  if (value === 'active' || value === 'ACTIVE') return MerchantStatus.ACTIVE;
  if (value === 'archived' || value === 'ARCHIVED') return MerchantStatus.ARCHIVED;
  return null;
}

function ratingValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5 ? value : null;
}

function dateValue(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function safeWebUrl(value: unknown): string | null {
  const candidate = text(value);
  if (!candidate) return null;
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function safePlatformUrl(value: unknown, platform: Platform): string | null {
  const candidate = text(value);
  if (!candidate) return null;
  try {
    const parsed = new URL(candidate);
    const isHttp = parsed.protocol === 'https:' || parsed.protocol === 'http:';
    const host = parsed.hostname.toLowerCase();
    if (platform === Platform.XIAOHONGSHU) {
      return isHttp || parsed.protocol === 'xhsdiscover:' ? candidate : null;
    }
    if (platform === Platform.INSTAGRAM) return isHttp ? candidate : null;
    if (!isHttp) return null;
    if (platform === Platform.GOOGLE) {
      const isGoogleReviewLink =
        (host === 'search.google.com' && parsed.pathname.startsWith('/local/writereview')) ||
        (host === 'g.page' && parsed.pathname.includes('/review'));
      return isGoogleReviewLink ? candidate : null;
    }
    const isYelpReviewOrBusinessPage =
      (host === 'yelp.com' || host.endsWith('.yelp.com')) &&
      (parsed.pathname.startsWith('/writeareview/') || parsed.pathname.startsWith('/biz/'));
    return isYelpReviewOrBusinessPage ? candidate : null;
  } catch {
    return null;
  }
}

function directLinkHelp(platform: Platform): string {
  if (platform === Platform.GOOGLE) {
    return 'Use the Google Business Profile “Get more reviews” link, not a Google Maps place URL.';
  }
  if (platform === Platform.YELP) {
    return 'Use a verified Yelp business page or Write a Review link.';
  }
  if (platform === Platform.XIAOHONGSHU) {
    return 'Use an https URL or an xhsdiscover:// deep link for Xiaohongshu.';
  }
  return 'Use a verified https Instagram destination.';
}

function slugify(value: string, fallback: string): string {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug || fallback;
}

async function readJson(request: NextRequest): Promise<JsonRecord | null> {
  try {
    return record(await request.json());
  } catch {
    return null;
  }
}

function invalidRequest() {
  return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
}
