import type {
  PublicPlatformLink,
  PublicReviewPage,
  PublicService,
} from '@/lib/domain/types';

export const MS_BEAUTY_MERCHANT_SLUG = 'ms-beauty';
export const MS_BEAUTY_LOCATION_SLUG = 'baltimore';
export const MS_BEAUTY_PUBLIC_PATH = `/r/${MS_BEAUTY_MERCHANT_SLUG}/${MS_BEAUTY_LOCATION_SLUG}`;

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
    destinationUrl:
      'https://www.google.com/search?q=MS+BEAUTY+1006+Eastern+Ave+Baltimore#lrd=0x89c8035d1afafeff:0x47a57effa39720a7,3',
    fallbackUrl: 'https://maps.google.com/?cid=5162608466650407079',
    ctaLabel: 'Write a Google review',
    publishHint: 'Draft copied! Opening Google Maps to write your review.',
  },
  {
    platform: 'xiaohongshu',
    destinationUrl: 'xhsdiscover://post',
    fallbackUrl: 'https://www.xiaohongshu.com/search_result?keyword=MS%20BEAUTY%20Baltimore',
    ctaLabel: '去小红书发布',
    publishHint: '文案已复制，进入小红书直接粘贴发布即可。',
  },
  {
    platform: 'yelp',
    destinationUrl: 'https://www.yelp.com/writeareview/biz/h-mlAQkvdUuVZruJxErjNA',
    fallbackUrl: 'https://www.yelp.com/biz/ms-beauty-baltimore-2',
    ctaLabel: 'Write a Yelp review',
    publishHint: 'Draft copied! Opening Yelp to write your review.',
  },
  {
    platform: 'instagram',
    destinationUrl: 'instagram://camera',
    fallbackUrl: 'https://www.instagram.com/create/style/',
    ctaLabel: 'Post on Instagram',
    publishHint: 'Caption copied! Opening Instagram to share your post.',
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
    logoUrl: 'https://www.msbeautymd.com/images/logo.png',
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
    heroImageUrl: '/images/ms-beauty/hero-collin-shelf.jpg',
    backgroundImageUrl: null,
    accentColor: '#9A6758',
    showAddress: true,
    showServices: true,
    reviewDisclosure: 'Please review and edit the draft so it reflects your real experience before publishing.',
    xiaohongshuQuery: 'MS BEAUTY Baltimore',
  },
  theme: 'dark',
  bannerUrl: '/images/ms-beauty/hero-collin-shelf.jpg',
  socialLinks: [
    {
      platform: 'xiaohongshu',
      handle: 'MSBEAUTY_BALTIMORE',
      url: 'https://www.xiaohongshu.com/user/profile/67c81f05000000000a03cf46?xsec_token=YB5Tz7Ls2iePJ1Peg1iHJNszPDqkHSiTPXNoaHWRzLKSM=&xsec_source=app_share&xhsshare=WeixinSession&appuid=67c81f05000000000a03cf46&apptime=1775356236',
    },
    {
      platform: 'instagram',
      handle: '@msbeauty_baltimore',
      url: 'https://www.instagram.com/msbeauty_baltimore/',
    },
    {
      platform: 'tiktok',
      handle: '@msbeauty.us',
      url: 'https://www.tiktok.com/@msbeauty.us',
    },
  ],
  galleryImages: ['/images/ms-beauty/storefront.png', '/images/ms-beauty/interior.png'],
  socialHandles: {
    instagram: '@msbeauty_baltimore',
    xiaohongshu: 'MSBEAUTY_BALTIMORE',
  },
  suggestedTags: ['Shoulders felt lighter', 'I could finally slow down', 'No sales pressure', 'Worth doing again'],
  services: MS_BEAUTY_SERVICES,
  platforms: MS_BEAUTY_PLATFORM_LINKS,
};

export const SUNNY_TEA_MERCHANT_SLUG = 'sunny-tea';
export const SUNNY_TEA_LOCATION_SLUG = 'rockville';

export const SUNNY_TEA_SERVICES: PublicService[] = [
  {
    slug: 'brown-sugar-boba',
    nameEn: 'Brown Sugar Boba Milk',
    nameZh: '黑糖波霸鲜奶',
    description: 'Fresh organic milk with slow-cooked warm brown sugar pearls.',
    imageUrl: null,
    displayOrder: 0,
  },
  {
    slug: 'matcha-cloud-latte',
    nameEn: 'Matcha Cloud Latte',
    nameZh: '宇治抹茶芝士',
    description: 'Ceremonial grade Uji matcha topped with rich sea salt cream.',
    imageUrl: null,
    displayOrder: 1,
  },
  {
    slug: 'taro-crepe-cake',
    nameEn: 'Fresh Taro Mille Crêpe',
    nameZh: '手作香芋千层',
    description: 'Handcrafted layers of delicate crepes with fresh taro purée.',
    imageUrl: null,
    displayOrder: 2,
  },
];

export const SUNNY_TEA_PUBLIC_PAGE: PublicReviewPage = {
  merchant: {
    slug: SUNNY_TEA_MERCHANT_SLUG,
    name: 'Sunny Tea & Bakery',
    description: 'Artisanal bubble tea and fresh Asian pastries crafted with premium ingredients.',
    industryTags: ['茶饮', '烘焙'],
    logoUrl: null,
    websiteUrl: 'https://sunnyteahouse.com/',
    phone: '+1 301-555-0199',
    brandColor: '#F5A623',
  },
  location: {
    slug: SUNNY_TEA_LOCATION_SLUG,
    name: 'Sunny Tea · Rockville',
    addressLine1: '200 Rockville Pike, Suite 102',
    addressLine2: null,
    city: 'Rockville',
    region: 'MD',
    postalCode: '20850',
    countryCode: 'US',
    openingHours: 'Monday–Sunday, 11:00 AM–9:30 PM',
    phone: '+1 301-555-0199',
  },
  config: {
    headline: 'Share your Sunny Tea experience',
    subheadline: 'Select a platform to share your tea moment with us.',
    heroImageUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=1200&auto=format&fit=crop',
    backgroundImageUrl: null,
    accentColor: '#F5A623',
    showAddress: true,
    showServices: true,
    reviewDisclosure: 'Please review and edit the draft so it reflects your real experience before publishing.',
    xiaohongshuQuery: 'Sunny Tea Rockville',
  },
  theme: 'light',
  bannerUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=1200&auto=format&fit=crop',
  socialLinks: [
    {
      platform: 'xiaohongshu',
      handle: 'SunnyTea_MD',
      url: 'https://www.xiaohongshu.com',
    },
    {
      platform: 'instagram',
      handle: '@sunnytea.md',
      url: 'https://www.instagram.com',
    },
    {
      platform: 'tiktok',
      handle: '@sunnyteahouse',
      url: 'https://www.tiktok.com',
    },
  ],
  galleryImages: [
    'https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1576092768241-dec231879fc3?q=80&w=800&auto=format&fit=crop',
  ],
  socialHandles: {
    instagram: '@sunnytea.md',
    xiaohongshu: 'SunnyTea_MD',
  },
  suggestedTags: ['Tasty drinks', 'Fresh ingredients', 'Cozy seating', 'Friendly staff'],
  services: SUNNY_TEA_SERVICES,
  platforms: [
    // Note: Instagram intentionally omitted to test Acceptance #5: Only show enabled platforms!
    {
      platform: 'google',
      destinationUrl: 'https://www.google.com/search?q=Sunny+Tea+Rockville#lrd=0x0:0x0,3',
      fallbackUrl: 'https://maps.google.com',
      ctaLabel: 'Write a Google review',
      publishHint: 'Draft copied! Opening Google Maps to write your review.',
    },
    {
      platform: 'xiaohongshu',
      destinationUrl: 'xhsdiscover://post',
      fallbackUrl: 'https://www.xiaohongshu.com/search_result?keyword=Sunny%20Tea%20Rockville',
      ctaLabel: '去小红书发布',
      publishHint: '文案已复制，进入小红书直接粘贴发布即可。',
    },
    {
      platform: 'yelp',
      destinationUrl: 'https://www.yelp.com/writeareview/search?q=Sunny+Tea+Rockville',
      fallbackUrl: 'https://www.yelp.com/search?find_desc=Sunny+Tea&find_loc=Rockville%2C+MD',
      ctaLabel: 'Write a Yelp review',
      publishHint: 'Draft copied! Opening Yelp to write your review.',
    },
  ],
};
