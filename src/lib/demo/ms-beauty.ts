import type {
  PublicPlatformLink,
  PublicReviewPage,
  PublicService,
} from '@/lib/domain/types';

export const MS_BEAUTY_MERCHANT_SLUG = 'ms-beauty';
export const MS_BEAUTY_LOCATION_SLUG = 'baltimore';
export const MS_BEAUTY_PUBLIC_PATH = `/r/${MS_BEAUTY_MERCHANT_SLUG}/${MS_BEAUTY_LOCATION_SLUG}`;

export const MS_BEAUTY_GOOGLE_WRITE_REVIEW_URL =
  'https://search.google.com/local/writereview?placeid=0x89c8035d1afafeff:0x47a57effa39720a7';

export const MS_BEAUTY_GOOGLE_MAPS_URL =
  'https://www.google.com/maps/place/MS+BEAUTY/@39.2853978,-76.600104,17z/data=!3m1!4b1!4m6!3m5!1s0x89c8035d1afafeff:0x47a57effa39720a7!8m2!3d39.2853978!4d-76.600104!16s%2Fg%2F11x6njxmfg!18m1!1e1?entry=ttu';

export const MS_BEAUTY_SERVICES: PublicService[] = [
  {
    slug: 'facial-spa',
    nameEn: 'Facial Spa',
    nameZh: '面部 SPA',
    description: 'A calm facial-care experience designed around your appointment.',
    imageUrl: null,
    displayOrder: 0,
  },
  {
    slug: 'scalp-spa',
    nameEn: 'Scalp Spa',
    nameZh: '头疗 SPA',
    description: 'A relaxing scalp-care appointment with attentive service.',
    imageUrl: null,
    displayOrder: 1,
  },
  {
    slug: 'back-spa',
    nameEn: 'Back Spa',
    nameZh: '背部 SPA',
    description: 'A comfortable back-care session for a slower, restorative visit.',
    imageUrl: null,
    displayOrder: 2,
  },
];

export const MS_BEAUTY_PLATFORM_LINKS: PublicPlatformLink[] = [
  {
    platform: 'google',
    destinationUrl: MS_BEAUTY_GOOGLE_WRITE_REVIEW_URL,
    fallbackUrl: MS_BEAUTY_GOOGLE_MAPS_URL,
    ctaLabel: 'Write a Google review',
    publishHint: 'Copy your draft, then paste directly into the Google review form.',
  },
  {
    platform: 'xiaohongshu',
    destinationUrl: 'xhsdiscover://post',
    fallbackUrl: 'https://www.xiaohongshu.com',
    ctaLabel: '去小红书发布',
    publishHint: '文案已复制，进入小红书直接粘贴发布即可。',
  },
  {
    platform: 'yelp',
    destinationUrl: 'https://www.yelp.com/writeareview/biz/ms-beauty-baltimore',
    fallbackUrl: 'https://www.yelp.com',
    ctaLabel: 'Write a Yelp review',
    publishHint: 'Copy your draft, then review it before posting to Yelp.',
  },
  {
    platform: 'instagram',
    destinationUrl: 'instagram://camera',
    fallbackUrl: 'https://www.instagram.com',
    ctaLabel: 'Post on Instagram',
    publishHint: 'Copy your caption and paste into your Instagram post.',
  },
];

/**
 * Safe fallback for local development and for the public route while a
 * database is intentionally not configured. It contains no customer data.
 */
export const MS_BEAUTY_PUBLIC_PAGE: PublicReviewPage = {
  merchant: {
    slug: MS_BEAUTY_MERCHANT_SLUG,
    name: 'MS BEAUTY',
    description:
      'A Baltimore beauty and wellness spa offering professional skincare, scalp therapy, and personalized relaxation services.',
    industryTags: ['美容', '头疗'],
    logoUrl: null,
    websiteUrl: 'https://msbeautymd.com/',
    phone: '+1 443-438-5887',
    brandColor: '#9A6758',
  },
  location: {
    slug: MS_BEAUTY_LOCATION_SLUG,
    name: 'MS BEAUTY · Baltimore',
    addressLine1: '1006 Eastern Ave',
    addressLine2: null,
    city: 'Baltimore',
    region: 'MD',
    postalCode: '21202',
    countryCode: 'US',
    openingHours: 'Monday–Sunday, 10:00 AM–8:00 PM',
    phone: '+1 443-438-5887',
  },
  config: {
    headline: 'Share your MS BEAUTY experience',
    subheadline: 'Choose a platform and make your review your own.',
    heroImageUrl: null,
    backgroundImageUrl: null,
    accentColor: '#9A6758',
    showAddress: true,
    showServices: true,
    reviewDisclosure: 'Please review and edit the draft so it reflects your real experience before publishing.',
    xiaohongshuQuery: 'MS BEAUTY Baltimore',
  },
  suggestedTags: ['Relaxing atmosphere', 'Thoughtful service', 'Clean space', 'Unhurried visit'],
  services: MS_BEAUTY_SERVICES,
  platforms: MS_BEAUTY_PLATFORM_LINKS,
};
