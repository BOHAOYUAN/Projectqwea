import type { PublicReviewPage } from '@/lib/domain/types';

/**
 * These are deliberately UI-owned rather than a mirror of the current
 * persistence enum. New channels can arrive in the public DTO gradually; an
 * unconfigured channel simply stays visible-but-unavailable for a location.
 */
export const PUBLIC_REVIEW_PLATFORMS = ['google', 'xiaohongshu', 'yelp', 'instagram'] as const;

export type PublicReviewPlatform = (typeof PUBLIC_REVIEW_PLATFORMS)[number];
export type PublicReviewVoice = 'natural' | 'concise' | 'warm';

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
  fallbackUrl?: string;
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
  // A public page can expose any enabled channel. Keeping lookup optional
  // means older locations simply show the newer cards as unavailable.
  const publicPlatforms: Array<PublicPlatformSource & { platform: string }> = page.platforms;
  const google = publicPlatforms.find((item) => item.platform === 'google');
  const xiaohongshu = publicPlatforms.find((item) => item.platform === 'xiaohongshu');
  const yelp = publicPlatforms.find((item) => item.platform === 'yelp');
  const instagram = publicPlatforms.find((item) => item.platform === 'instagram');
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
      google: toPlatformSetup(google, 'google'),
      // A configured Xiaohongshu integration may deliberately use a deep-link
      // or a web-search fallback, so its presence is sufficient to open it.
      xiaohongshu: toPlatformSetup(xiaohongshu, 'xiaohongshu', { allowConfiguredFallback: true }),
      yelp: toPlatformSetup(yelp, 'yelp'),
      instagram: toPlatformSetup(instagram, 'instagram'),
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

type PublicPlatformSource = {
  destinationUrl: string | null;
  fallbackUrl: string | null;
  publishHint: string | null;
};

const DEFAULT_PLATFORM_CONFIGS: Record<
  PublicReviewPlatform,
  { destinationUrl: string; fallbackUrl: string; publishHint: string }
> = {
  google: {
    destinationUrl:
      'https://www.google.com/search?q=MS+BEAUTY+1006+Eastern+Ave+Baltimore#lrd=0x89c8035d1afafeff:0x47a57effa39720a7,3',
    fallbackUrl: 'https://maps.google.com/?cid=5162608466650407079',
    publishHint: 'Draft copied! Opening Google Maps to write your review.',
  },
  xiaohongshu: {
    destinationUrl: 'xhsdiscover://post',
    fallbackUrl: 'https://www.xiaohongshu.com/search_result?keyword=MS%20BEAUTY%20Baltimore',
    publishHint: '文案已复制，进入小红书直接粘贴发布即可。',
  },
  yelp: {
    destinationUrl: 'https://www.yelp.com/writeareview/search?q=MS+BEAUTY+Baltimore',
    fallbackUrl: 'https://www.yelp.com/search?find_desc=MS+BEAUTY&find_loc=Baltimore%2C+MD',
    publishHint: 'Draft copied! Opening Yelp to write your review.',
  },
  instagram: {
    destinationUrl: 'instagram://camera',
    fallbackUrl: 'https://www.instagram.com/',
    publishHint: 'Caption copied! Opening Instagram to share your post.',
  },
};

function toPlatformSetup(
  source: PublicPlatformSource | undefined,
  platform: PublicReviewPlatform,
  options: { allowConfiguredFallback?: boolean } = {},
): PublicReviewPlatformSetup {
  const fallbackConfig = DEFAULT_PLATFORM_CONFIGS[platform];
  const rawDest = source?.destinationUrl || fallbackConfig.destinationUrl;
  const rawFallback = source?.fallbackUrl || fallbackConfig.fallbackUrl;

  const destinationUrl = isPublicPlatformUrl(rawDest, platform) ? rawDest : fallbackConfig.destinationUrl;
  const fallbackUrl = isPublicPlatformUrl(rawFallback, platform) ? rawFallback : fallbackConfig.fallbackUrl;

  return {
    enabled: true,
    destinationUrl,
    fallbackUrl,
    publishHint: source?.publishHint || fallbackConfig.publishHint,
  };
}

/** Client-side guard for platform URLs. */
function isPublicPlatformUrl(value: string | null | undefined, platform: PublicReviewPlatform) {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();
    const isHttp = parsed.protocol === 'https:' || parsed.protocol === 'http:';
    if (platform === 'xiaohongshu') return isHttp || parsed.protocol === 'xhsdiscover:';
    if (platform === 'instagram') return isHttp || parsed.protocol === 'instagram:';
    if (!isHttp) return false;
    if (platform === 'google') {
      return (
        (host === 'search.google.com' && parsed.pathname.startsWith('/local/writereview')) ||
        (host === 'g.page' && parsed.pathname.includes('/review')) ||
        host.includes('google.')
      );
    }
    return (
      (host === 'yelp.com' || host.endsWith('.yelp.com')) &&
      (parsed.pathname.startsWith('/writeareview') || parsed.pathname.startsWith('/biz') || parsed.pathname.startsWith('/search'))
    );
  } catch {
    return false;
  }
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
