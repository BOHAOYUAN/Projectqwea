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
      destinationUrl: 'https://search.google.com/local/writereview?placeid=0x89c8035d1afafeff:0x47a57effa39720a7',
      fallbackUrl: 'https://maps.google.com/?cid=5162608466650407079',
      ctaLabel: 'Write a Google review',
      publishHint: 'Draft copied! Opening Google Maps to write your review.',
      isEnabled: true,
    },
    create: {
      locationId: location.id,
      platform: Platform.GOOGLE,
      destinationUrl: 'https://search.google.com/local/writereview?placeid=0x89c8035d1afafeff:0x47a57effa39720a7',
      fallbackUrl: 'https://maps.google.com/?cid=5162608466650407079',
      ctaLabel: 'Write a Google review',
      publishHint: 'Draft copied! Opening Google Maps to write your review.',
      isEnabled: true,
    },
  });

  await prisma.platformLink.upsert({
    where: { locationId_platform: { locationId: location.id, platform: Platform.YELP } },
    update: {
      destinationUrl: 'https://www.yelp.com/writeareview/biz/ms-beauty-baltimore',
      fallbackUrl: 'https://www.yelp.com/biz/ms-beauty-baltimore',
      ctaLabel: 'Write a Yelp review',
      publishHint: 'Draft copied! Opening Yelp to write your review.',
      isEnabled: true,
    },
    create: {
      locationId: location.id,
      platform: Platform.YELP,
      destinationUrl: 'https://www.yelp.com/writeareview/biz/ms-beauty-baltimore',
      fallbackUrl: 'https://www.yelp.com/biz/ms-beauty-baltimore',
      ctaLabel: 'Write a Yelp review',
      publishHint: 'Draft copied! Opening Yelp to write your review.',
      isEnabled: true,
    },
  });

  await prisma.platformLink.upsert({
    where: { locationId_platform: { locationId: location.id, platform: Platform.INSTAGRAM } },
    update: {
      destinationUrl: 'https://www.instagram.com/',
      fallbackUrl: 'https://www.instagram.com/',
      ctaLabel: 'Create an Instagram caption',
      publishHint: 'Caption copied! Opening Instagram to share your post.',
      isEnabled: true,
    },
    create: {
      locationId: location.id,
      platform: Platform.INSTAGRAM,
      destinationUrl: 'https://www.instagram.com/',
      fallbackUrl: 'https://www.instagram.com/',
      ctaLabel: 'Create an Instagram caption',
      publishHint: 'Caption copied! Opening Instagram to share your post.',
      isEnabled: true,
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
