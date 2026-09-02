import type { PublicReviewPage } from '@/lib/domain/types';

export type PublicReviewPlatform = 'google' | 'xiaohongshu';

export type PublicReviewService = {
  id: string;
  name: string;
  englishName: string;
  description: string;
  chineseDescription: string;
  accent: string;
};

export type PublicReviewTag = {
  id: string;
  label: string;
  googleLabel: string;
};

export type PublicReviewPlatformSetup = {
  enabled: boolean;
  destinationUrl?: string;
  publishHint?: string;
};

export type PublicReviewMerchant = {
  name: string;
  merchantSlug: string;
  locationSlug: string;
  address: string;
  neighborhood: string;
  industryLabel: string;
  description: string;
  headline?: string;
  subheadline?: string;
  showAddress?: boolean;
  reviewDisclosure?: string;
  platforms: Record<PublicReviewPlatform, PublicReviewPlatformSetup>;
  services: PublicReviewService[];
  experienceTags: PublicReviewTag[];
};

const DEFAULT_SERVICE_ACCENTS = ['from-rose-100 to-orange-50', 'from-amber-100 to-yellow-50', 'from-stone-200 to-amber-50'];

const DEFAULT_EXPERIENCE_TAGS: PublicReviewTag[] = [
  { id: 'calm', label: '放松舒服', googleLabel: 'Relaxing atmosphere' },
  { id: 'attentive', label: '细心专业', googleLabel: 'Thoughtful service' },
  { id: 'clean', label: '环境整洁', googleLabel: 'Clean space' },
  { id: 'unhurried', label: '节奏不赶', googleLabel: 'Unhurried visit' },
];

/** Converts the server's anonymous-safe page DTO into the compact UI model. */
export function merchantFromPublicReviewPage(page: PublicReviewPage): PublicReviewMerchant {
  const google = page.platforms.find((item) => item.platform === 'google');
  const xiaohongshu = page.platforms.find((item) => item.platform === 'xiaohongshu');
  const googleUrl = google?.destinationUrl || google?.fallbackUrl || undefined;
  const xiaohongshuUrl = xiaohongshu?.destinationUrl || xiaohongshu?.fallbackUrl || undefined;
  const address = [
    page.location.addressLine1,
    page.location.addressLine2,
    [page.location.city, page.location.region, page.location.postalCode].filter(Boolean).join(', '),
  ]
    .filter(Boolean)
    .join(', ');

  return {
    name: page.merchant.name,
    merchantSlug: page.merchant.slug,
    locationSlug: page.location.slug,
    address,
    neighborhood: [page.location.city, page.location.region].filter(Boolean).join(', ') || page.location.name,
    industryLabel: page.merchant.industryTags.join(' · ') || 'Guest feedback',
    description: page.merchant.description || page.config.subheadline || 'Share your experience in your own words.',
    headline: page.config.headline || undefined,
    subheadline: page.config.subheadline || undefined,
    showAddress: page.config.showAddress,
    reviewDisclosure: page.config.reviewDisclosure || undefined,
    platforms: {
      google: {
        enabled: Boolean(googleUrl),
        destinationUrl: googleUrl,
        publishHint: google?.publishHint || undefined,
      },
      xiaohongshu: {
        // A configured Xiaohongshu integration may deliberately use a web-search fallback.
        enabled: Boolean(xiaohongshu),
        destinationUrl: xiaohongshuUrl,
        publishHint: xiaohongshu?.publishHint || undefined,
      },
    },
    services:
      page.services.length > 0
        ? page.services.map((service, index) => ({
            id: service.slug,
            name: service.nameZh,
            englishName: service.nameEn,
            description: service.description || 'A service selected during your visit.',
            chineseDescription: '本次到店体验的服务项目。',
            accent: DEFAULT_SERVICE_ACCENTS[index % DEFAULT_SERVICE_ACCENTS.length],
          }))
        : [],
    experienceTags: toPublicReviewTags(page.suggestedTags),
  };
}

const TAG_COPY: Record<string, PublicReviewTag> = {
  'Relaxing atmosphere': { id: 'calm', label: '放松舒服', googleLabel: 'Relaxing atmosphere' },
  'Thoughtful service': { id: 'attentive', label: '细心专业', googleLabel: 'Thoughtful service' },
  'Clean space': { id: 'clean', label: '环境整洁', googleLabel: 'Clean space' },
  'Unhurried visit': { id: 'unhurried', label: '节奏不赶', googleLabel: 'Unhurried visit' },
  'Professional care': { id: 'professional', label: '专业细致', googleLabel: 'Professional care' },
  'Friendly service': { id: 'friendly', label: '服务亲切', googleLabel: 'Friendly service' },
};

function toPublicReviewTags(suggestedTags: string[]): PublicReviewTag[] {
  if (suggestedTags.length === 0) return DEFAULT_EXPERIENCE_TAGS;

  return suggestedTags.slice(0, 8).map((value, index) => {
    const known = TAG_COPY[value];
    if (known) return known;
    return {
      id: `${value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'tag'}-${index}`,
      label: value,
      googleLabel: value,
    };
  });
}

export function publicReviewPath(merchant: PublicReviewMerchant): string {
  return `/r/${encodeURIComponent(merchant.merchantSlug)}/${encodeURIComponent(merchant.locationSlug)}`;
}

export function publicReviewPlatformPath(
  merchant: PublicReviewMerchant,
  platform: PublicReviewPlatform,
): string {
  return `${publicReviewPath(merchant)}/review/${platform}`;
}
