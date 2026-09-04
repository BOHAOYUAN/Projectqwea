import { MerchantStatus, Platform, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const services = [
  {
    slug: 'facial-spa',
    nameEn: 'Facial Spa',
    nameZh: '面部 SPA',
    description: 'A calm facial-care experience designed around your appointment.',
  },
  {
    slug: 'scalp-spa',
    nameEn: 'Scalp Spa',
    nameZh: '头疗 SPA',
    description: 'A relaxing scalp-care appointment with attentive service.',
  },
  {
    slug: 'back-spa',
    nameEn: 'Back Spa',
    nameZh: '背部 SPA',
    description: 'A comfortable back-care session for a slower, restorative visit.',
  },
];

async function main() {
  const merchant = await prisma.merchant.upsert({
    where: { slug: 'ms-beauty' },
    update: {
      name: 'MS BEAUTY',
      description:
        'A Baltimore beauty and wellness spa offering professional skincare, scalp therapy, and personalized relaxation services.',
      industryTags: ['美容', '头疗'],
      websiteUrl: 'https://msbeautymd.com/',
      phone: '+1 443-438-5887',
      brandColor: '#9A6758',
      defaultLocale: 'en-US',
      status: MerchantStatus.ACTIVE,
    },
    create: {
      slug: 'ms-beauty',
      name: 'MS BEAUTY',
      description:
        'A Baltimore beauty and wellness spa offering professional skincare, scalp therapy, and personalized relaxation services.',
      industryTags: ['美容', '头疗'],
      websiteUrl: 'https://msbeautymd.com/',
      phone: '+1 443-438-5887',
      brandColor: '#9A6758',
      defaultLocale: 'en-US',
      status: MerchantStatus.ACTIVE,
    },
  });

  const location = await prisma.location.upsert({
    where: {
      merchantId_slug: {
        merchantId: merchant.id,
        slug: 'baltimore',
      },
    },
    update: {
      name: 'MS BEAUTY · Baltimore',
      addressLine1: '1006 Eastern Ave',
      city: 'Baltimore',
      region: 'MD',
      postalCode: '21202',
      countryCode: 'US',
      timezone: 'America/New_York',
      latitude: '39.2853978',
      longitude: '-76.600104',
      phone: '+1 443-438-5887',
      openingHours: 'Monday–Sunday, 10:00 AM–8:00 PM',
      isActive: true,
    },
    create: {
      merchantId: merchant.id,
      slug: 'baltimore',
      name: 'MS BEAUTY · Baltimore',
      addressLine1: '1006 Eastern Ave',
      city: 'Baltimore',
      region: 'MD',
      postalCode: '21202',
      countryCode: 'US',
      timezone: 'America/New_York',
      latitude: '39.2853978',
      longitude: '-76.600104',
      phone: '+1 443-438-5887',
      openingHours: 'Monday–Sunday, 10:00 AM–8:00 PM',
      isActive: true,
    },
  });

  await Promise.all(
    services.map((service, displayOrder) =>
      prisma.service.upsert({
        where: {
          locationId_slug: {
            locationId: location.id,
            slug: service.slug,
          },
        },
        update: { ...service, displayOrder, isActive: true },
        create: { locationId: location.id, ...service, displayOrder, isActive: true },
      })
    )
  );

  await prisma.platformLink.upsert({
    where: { locationId_platform: { locationId: location.id, platform: Platform.GOOGLE } },
    update: {
      destinationUrl: null,
      fallbackUrl: null,
      ctaLabel: 'Write a Google review',
      publishHint: 'Add the verified Google “Get more reviews” link before enabling this channel.',
      isEnabled: false,
    },
    create: {
      locationId: location.id,
      platform: Platform.GOOGLE,
      destinationUrl: null,
      ctaLabel: 'Write a Google review',
      publishHint: 'Add the verified Google “Get more reviews” link before enabling this channel.',
      isEnabled: false,
    },
  });

  // These two channels are intentionally visible to the operator but remain
  // disabled until MS BEAUTY supplies verified destination URLs. No fake Yelp
  // or Instagram link is ever exposed on the public customer page.
  await prisma.platformLink.upsert({
    where: { locationId_platform: { locationId: location.id, platform: Platform.YELP } },
    update: {
      destinationUrl: null,
      fallbackUrl: null,
      ctaLabel: 'Write a Yelp review',
      publishHint: 'Add the verified Yelp business-review link before enabling this channel.',
      isEnabled: false,
    },
    create: {
      locationId: location.id,
      platform: Platform.YELP,
      ctaLabel: 'Write a Yelp review',
      publishHint: 'Add the verified Yelp business-review link before enabling this channel.',
      isEnabled: false,
    },
  });

  await prisma.platformLink.upsert({
    where: { locationId_platform: { locationId: location.id, platform: Platform.INSTAGRAM } },
    update: {
      destinationUrl: null,
      fallbackUrl: null,
      ctaLabel: 'Create an Instagram caption',
      publishHint: 'Add the verified Instagram profile or publishing destination before enabling this channel.',
      isEnabled: false,
    },
    create: {
      locationId: location.id,
      platform: Platform.INSTAGRAM,
      ctaLabel: 'Create an Instagram caption',
      publishHint: 'Add the verified Instagram profile or publishing destination before enabling this channel.',
      isEnabled: false,
    },
  });

  await prisma.platformLink.upsert({
    where: { locationId_platform: { locationId: location.id, platform: Platform.XIAOHONGSHU } },
    update: {
      destinationUrl: 'xhsdiscover://post',
      fallbackUrl: 'https://www.xiaohongshu.com/search_result?keyword=MS%20BEAUTY%20Baltimore',
      ctaLabel: '生成小红书笔记',
      publishHint: '发布前请核对内容，并在小红书中补充真实图片和体验。',
      isEnabled: true,
    },
    create: {
      locationId: location.id,
      platform: Platform.XIAOHONGSHU,
      destinationUrl: 'xhsdiscover://post',
      fallbackUrl: 'https://www.xiaohongshu.com/search_result?keyword=MS%20BEAUTY%20Baltimore',
      ctaLabel: '生成小红书笔记',
      publishHint: '发布前请核对内容，并在小红书中补充真实图片和体验。',
      isEnabled: true,
    },
  });

  await prisma.publicPageConfig.upsert({
    where: { locationId: location.id },
    update: {
      isPublished: true,
      headline: 'Share your MS BEAUTY experience',
      subheadline: 'Choose a platform and make your review your own.',
      accentColor: '#9A6758',
      showAddress: true,
      showServices: true,
      reviewDisclosure: 'Please review and edit the draft so it reflects your real experience before publishing.',
      xiaohongshuQuery: 'MS BEAUTY Baltimore',
    },
    create: {
      locationId: location.id,
      isPublished: true,
      headline: 'Share your MS BEAUTY experience',
      subheadline: 'Choose a platform and make your review your own.',
      accentColor: '#9A6758',
      showAddress: true,
      showServices: true,
      reviewDisclosure: 'Please review and edit the draft so it reflects your real experience before publishing.',
      xiaohongshuQuery: 'MS BEAUTY Baltimore',
    },
  });

  await prisma.contentPreference.upsert({
    where: { locationId: location.id },
    update: {
      suggestedTags: ['Relaxing atmosphere', 'Thoughtful service', 'Clean space', 'Unhurried visit'],
      googleTone: 'Warm, specific, natural American English; never overstate results.',
      xiaohongshuTone: '真实、轻松、有生活感；不虚构疗效、价格或人员姓名。',
      forbiddenClaims: ['medical claims', 'guaranteed results', 'invented prices', 'invented staff names'],
    },
    create: {
      locationId: location.id,
      suggestedTags: ['Relaxing atmosphere', 'Thoughtful service', 'Clean space', 'Unhurried visit'],
      googleTone: 'Warm, specific, natural American English; never overstate results.',
      xiaohongshuTone: '真实、轻松、有生活感；不虚构疗效、价格或人员姓名。',
      forbiddenClaims: ['medical claims', 'guaranteed results', 'invented prices', 'invented staff names'],
    },
  });

  console.info('Seeded MS BEAUTY at /r/ms-beauty/baltimore');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
