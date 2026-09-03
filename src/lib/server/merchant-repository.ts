import {
  fromPersistencePlatform,
  toPersistencePlatform,
  type AuthenticatedUser,
  type GenerationProvider,
  type MembershipRole,
  type PlatformKey,
  type PublicReviewPage,
} from '@/lib/domain/types';
import {
  MS_BEAUTY_LOCATION_SLUG,
  MS_BEAUTY_MERCHANT_SLUG,
  MS_BEAUTY_PUBLIC_PAGE,
} from '@/lib/demo/ms-beauty';
import { getPrismaClient } from '@/lib/server/prisma';

export interface MerchantAccess {
  merchantId: string;
  merchantSlug: string;
  merchantName: string;
  role: MembershipRole;
}

export interface AnonymousGenerationMetricInput {
  merchantSlug: string;
  locationSlug: string;
  platform: PlatformKey;
  provider: GenerationProvider;
  serviceSlug?: string;
  selectedTags: string[];
}

/**
 * Mirrors the minimum safe profile fields from a verified Supabase Auth user
 * into `app_users`. It never creates a membership: merchant access must be
 * granted deliberately through a Membership row.
 */
export async function upsertAppUser(
  user: AuthenticatedUser
): Promise<{ id: string; email: string | null; displayName: string | null } | null> {
  const client = getPrismaClient();
  if (!client) return null;

  return client.user.upsert({
    where: { id: user.id },
    update: {
      email: user.email,
      displayName: user.displayName,
    },
    create: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
    },
    select: { id: true, email: true, displayName: true },
  });
}

/**
 * Reads exactly the fields that may be sent to an anonymous customer page.
 * It intentionally omits membership, metrics, reply-draft, and customer input
 * fields. When persistence is disabled, only the known MS BEAUTY demo path is
 * available as a fallback.
 */
export async function getPublicReviewPage(
  merchantSlug: string,
  locationSlug: string
): Promise<PublicReviewPage | null> {
  if (!isSafeSlug(merchantSlug) || !isSafeSlug(locationSlug)) {
    return null;
  }

  const client = getPrismaClient();
  if (!client) {
    return getDemoPage(merchantSlug, locationSlug);
  }

  try {
    const location = await client.location.findFirst({
      where: {
        slug: locationSlug,
        isActive: true,
        merchant: { slug: merchantSlug },
      },
      select: {
        slug: true,
        name: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        region: true,
        postalCode: true,
        countryCode: true,
        openingHours: true,
        phone: true,
        merchant: {
          select: {
            slug: true,
            name: true,
            description: true,
            industryTags: true,
            logoUrl: true,
            websiteUrl: true,
            phone: true,
            brandColor: true,
            status: true,
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
          },
        },
        services: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
          select: {
            slug: true,
            nameEn: true,
            nameZh: true,
            description: true,
            imageUrl: true,
            displayOrder: true,
          },
        },
        platformLinks: {
          where: { isEnabled: true },
          select: {
            platform: true,
            destinationUrl: true,
            fallbackUrl: true,
            ctaLabel: true,
            publishHint: true,
          },
        },
      },
    });

    // A configured database is the source of truth. In particular, a missing,
    // unpublished, inactive, or deleted location must never fall back to a
    // static page with the same slug.
    if (!location) return null;
    if (location.merchant.status !== 'ACTIVE' || !location.publicPage?.isPublished) return null;

    return {
      merchant: {
        slug: location.merchant.slug,
        name: location.merchant.name,
        description: location.merchant.description,
        industryTags: location.merchant.industryTags,
        logoUrl: location.merchant.logoUrl,
        websiteUrl: location.merchant.websiteUrl,
        phone: location.merchant.phone,
        brandColor: location.merchant.brandColor,
      },
      location: {
        slug: location.slug,
        name: location.name,
        addressLine1: location.addressLine1,
        addressLine2: location.addressLine2,
        city: location.city,
        region: location.region,
        postalCode: location.postalCode,
        countryCode: location.countryCode,
        openingHours: location.openingHours,
        phone: location.phone,
      },
      config: {
        headline: location.publicPage.headline,
        subheadline: location.publicPage.subheadline,
        heroImageUrl: location.publicPage.heroImageUrl,
        backgroundImageUrl: location.publicPage.backgroundImageUrl,
        accentColor: location.publicPage.accentColor,
        showAddress: location.publicPage.showAddress,
        showServices: location.publicPage.showServices,
        reviewDisclosure: location.publicPage.reviewDisclosure,
        xiaohongshuQuery: location.publicPage.xiaohongshuQuery,
      },
      suggestedTags: location.contentPreference?.suggestedTags ?? [],
      services: location.services,
      platforms: location.platformLinks.map((link) => ({
        ...link,
        platform: fromPersistencePlatform(link.platform),
      })),
    };
  } catch {
    // Do not turn a database outage into a stale public page. The deterministic
    // MS BEAUTY fallback is used only when persistence is intentionally absent.
    return null;
  }
}

/** A server-side authorization lookup for dashboard/API mutations. */
export async function getMerchantAccess(
  userId: string,
  merchantSlug: string
): Promise<MerchantAccess | null> {
  const client = getPrismaClient();
  if (!client || !userId || !isSafeSlug(merchantSlug)) return null;

  const membership = await client.membership.findFirst({
    where: {
      userId,
      merchant: {
        slug: merchantSlug,
        status: { not: 'ARCHIVED' },
      },
    },
    select: {
      role: true,
      merchant: {
        select: { id: true, slug: true, name: true },
      },
    },
  });

  if (!membership) return null;

  return {
    merchantId: membership.merchant.id,
    merchantSlug: membership.merchant.slug,
    merchantName: membership.merchant.name,
    role: membership.role.toLowerCase() as MembershipRole,
  };
}

/** Supports a dashboard merchant switcher without exposing another tenant's data. */
export async function listMerchantAccess(userId: string): Promise<MerchantAccess[]> {
  const client = getPrismaClient();
  if (!client || !userId) return [];

  const memberships = await client.membership.findMany({
    where: {
      userId,
      merchant: { status: { not: 'ARCHIVED' } },
    },
    orderBy: { merchant: { name: 'asc' } },
    select: {
      role: true,
      merchant: {
        select: { id: true, slug: true, name: true },
      },
    },
  });

  return memberships.map((membership) => ({
    merchantId: membership.merchant.id,
    merchantSlug: membership.merchant.slug,
    merchantName: membership.merchant.name,
    role: membership.role.toLowerCase() as MembershipRole,
  }));
}

/**
 * Records conversion analytics without retaining a customer's free-form text
 * or generated draft. It is safe for the anonymous public generation flow.
 */
export async function recordAnonymousGenerationMetric(
  input: AnonymousGenerationMetricInput
): Promise<string | null> {
  const client = getPrismaClient();
  if (
    !client ||
    !isSafeSlug(input.merchantSlug) ||
    !isSafeSlug(input.locationSlug) ||
    (input.serviceSlug !== undefined && !isSafeSlug(input.serviceSlug))
  ) {
    return null;
  }

  try {
    const location = await client.location.findFirst({
      where: {
        slug: input.locationSlug,
        isActive: true,
        merchant: { slug: input.merchantSlug, status: 'ACTIVE' },
        publicPage: { is: { isPublished: true } },
      },
      select: {
        id: true,
        merchantId: true,
        services: {
          where: { isActive: true },
          select: { id: true, slug: true },
        },
      },
    });

    if (!location) return null;

    const metric = await client.generationMetric.create({
      data: {
        merchantId: location.merchantId,
        locationId: location.id,
        serviceId: input.serviceSlug
          ? location.services.find((service) => service.slug === input.serviceSlug)?.id
          : undefined,
        platform: toPersistencePlatform(input.platform),
        provider: input.provider === 'deepseek' ? 'DEEPSEEK' : input.provider === 'groq' ? 'GROQ' : 'LOCAL',
        selectedTags: input.selectedTags.slice(0, 8),
      },
      select: { id: true },
    });

    return metric.id;
  } catch {
    // Analytics must not prevent an anonymous customer from receiving a draft.
    return null;
  }
}

export async function markGenerationMetricAction(
  metricId: string,
  action: 'copied' | 'published-click'
): Promise<boolean> {
  const client = getPrismaClient();
  if (!client || !isUuid(metricId)) return false;

  try {
    await client.generationMetric.update({
      where: { id: metricId },
      data: action === 'copied' ? { wasCopied: true } : { wasPublishedClick: true },
      select: { id: true },
    });
    return true;
  } catch {
    // A metric could expire or belong to an unpublished page; analytics must
    // never make the customer-facing copy flow fail.
    return false;
  }
}

function getDemoPage(merchantSlug: string, locationSlug: string): PublicReviewPage | null {
  return merchantSlug === MS_BEAUTY_MERCHANT_SLUG && locationSlug === MS_BEAUTY_LOCATION_SLUG
    ? MS_BEAUTY_PUBLIC_PAGE
    : null;
}

function isSafeSlug(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
