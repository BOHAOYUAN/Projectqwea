import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ReviewPlatformUnavailable, ReviewPublish } from '@/components/public-review/review-agent';
import {
  merchantFromPublicReviewPage,
  type PublicReviewPlatform,
} from '@/components/public-review/public-review-model';
import { getPublicReviewPage } from '@/lib/server/merchant-repository';

type PublicReviewPublishPageProps = {
  params: Promise<{ merchantSlug: string; locationSlug: string; platform: string }>;
};

function toPlatform(value: string): PublicReviewPlatform | null {
  return value === 'google' || value === 'xiaohongshu' || value === 'yelp' || value === 'instagram'
    ? value
    : null;
}

export async function generateMetadata({ params }: PublicReviewPublishPageProps): Promise<Metadata> {
  const { merchantSlug, locationSlug } = await params;
  const page = await getPublicReviewPage(merchantSlug, locationSlug);
  const merchant = page ? merchantFromPublicReviewPage(page) : null;
  return {
    title: `${merchant?.name || 'Review'} | Check draft`,
    description: merchant ? `Review and publish your draft for ${merchant.name}.` : 'Review and publish your draft.',
  };
}

export default async function PublicReviewPublishPage({ params }: PublicReviewPublishPageProps) {
  const { merchantSlug, locationSlug, platform: rawPlatform } = await params;
  const platform = toPlatform(rawPlatform);
  if (!platform) notFound();

  const page = await getPublicReviewPage(merchantSlug, locationSlug);
  if (!page) notFound();

  const merchant = merchantFromPublicReviewPage(page);
  if (!merchant.platforms[platform].enabled) {
    return <ReviewPlatformUnavailable merchant={merchant} platform={platform} />;
  }

  return <ReviewPublish merchant={merchant} platform={platform} />;
}
