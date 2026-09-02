/**
 * App-owned types for data crossing the dashboard, server, and public review
 * page boundaries. These deliberately do not import Prisma types so public
 * clients never need a database dependency.
 */

export const PLATFORM_KEYS = ['google', 'xiaohongshu'] as const;

export type PlatformKey = (typeof PLATFORM_KEYS)[number];
export type PersistencePlatform = 'GOOGLE' | 'XIAOHONGSHU';
export type MerchantStatus = 'draft' | 'active' | 'archived';
export type MembershipRole = 'owner' | 'admin' | 'editor' | 'analyst' | 'viewer';
export type GenerationProvider = 'local' | 'groq';
export type ReplyDraftStatus = 'draft' | 'approved' | 'sent' | 'archived';
export type ReviewSource = 'manual' | 'demo' | 'api';

export interface AuthenticatedUser {
  id: string;
  email: string | null;
  displayName: string | null;
}

export interface MerchantRecord {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  industryTags: string[];
  logoUrl: string | null;
  websiteUrl: string | null;
  phone: string | null;
  brandColor: string | null;
  defaultLocale: string;
  status: MerchantStatus;
}

export interface LocationRecord {
  id: string;
  merchantId: string;
  slug: string;
  name: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  countryCode: string;
  timezone: string;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  openingHours: string | null;
  isActive: boolean;
}

export interface ServiceRecord {
  id: string;
  locationId: string;
  slug: string;
  nameEn: string;
  nameZh: string;
  description: string | null;
  imageUrl: string | null;
  displayOrder: number;
  isActive: boolean;
}

export interface PlatformLinkRecord {
  id: string;
  locationId: string;
  platform: PlatformKey;
  destinationUrl: string | null;
  fallbackUrl: string | null;
  ctaLabel: string | null;
  publishHint: string | null;
  isEnabled: boolean;
}

export interface PublicPageConfigRecord {
  id: string;
  locationId: string;
  isPublished: boolean;
  headline: string | null;
  subheadline: string | null;
  heroImageUrl: string | null;
  backgroundImageUrl: string | null;
  accentColor: string | null;
  showAddress: boolean;
  showServices: boolean;
  reviewDisclosure: string | null;
  xiaohongshuQuery: string | null;
}

export interface ContentPreferenceRecord {
  id: string;
  locationId: string;
  suggestedTags: string[];
  googleTone: string | null;
  xiaohongshuTone: string | null;
  forbiddenClaims: string[];
}

export interface GenerationMetricInput {
  merchantId: string;
  locationId: string;
  serviceId?: string;
  platform: PlatformKey;
  provider: GenerationProvider;
  selectedTags: string[];
  wasCopied?: boolean;
  wasPublishedClick?: boolean;
}

export interface ReviewReplyDraftRecord {
  id: string;
  merchantId: string;
  locationId: string;
  createdById: string | null;
  sourcePlatform: PlatformKey;
  rating: number | null;
  reviewExcerpt: string | null;
  summary: string | null;
  draftText: string;
  status: ReplyDraftStatus;
}

export interface ManagedReviewRecord {
  id: string;
  merchantId: string;
  locationId: string;
  platform: PlatformKey;
  source: ReviewSource;
  externalReviewId: string | null;
  reviewerAlias: string | null;
  rating: number | null;
  reviewText: string;
  reviewedAt: string | null;
}

/** Fields that are explicitly safe to serialize to an anonymous customer page. */
export interface PublicMerchant {
  slug: string;
  name: string;
  description: string | null;
  industryTags: string[];
  logoUrl: string | null;
  websiteUrl: string | null;
  phone: string | null;
  brandColor: string | null;
}

export interface PublicLocation {
  slug: string;
  name: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  countryCode: string;
  openingHours: string | null;
  phone: string | null;
}

export interface PublicService {
  slug: string;
  nameEn: string;
  nameZh: string;
  description: string | null;
  imageUrl: string | null;
  displayOrder: number;
}

export interface PublicPlatformLink {
  platform: PlatformKey;
  destinationUrl: string | null;
  fallbackUrl: string | null;
  ctaLabel: string | null;
  publishHint: string | null;
}

export interface PublicReviewPage {
  merchant: PublicMerchant;
  location: PublicLocation;
  config: Pick<
    PublicPageConfigRecord,
    | 'headline'
    | 'subheadline'
    | 'heroImageUrl'
    | 'backgroundImageUrl'
    | 'accentColor'
    | 'showAddress'
    | 'showServices'
    | 'reviewDisclosure'
    | 'xiaohongshuQuery'
  >;
  suggestedTags: string[];
  services: PublicService[];
  platforms: PublicPlatformLink[];
}

export function toPersistencePlatform(platform: PlatformKey): PersistencePlatform {
  return platform === 'google' ? 'GOOGLE' : 'XIAOHONGSHU';
}

export function fromPersistencePlatform(platform: PersistencePlatform): PlatformKey {
  return platform === 'GOOGLE' ? 'google' : 'xiaohongshu';
}

export function isPlatformKey(value: unknown): value is PlatformKey {
  return typeof value === 'string' && (PLATFORM_KEYS as readonly string[]).includes(value);
}
