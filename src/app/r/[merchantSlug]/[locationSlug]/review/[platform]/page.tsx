import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ReviewAgent, ReviewPlatformUnavailable } from '@/components/public-review/review-agent';
import {
  merchantFromPublicReviewPage,
  type PublicReviewPlatform,
} from '@/components/public-review/public-review-model';
import { getPublicReviewPage } from '@/lib/server/merchant-repository';

type PublicReviewAgentPageProps = {
  params: Promise<{ merchantSlug: string; locationSlug: string; platform: string }>;
};

function toPlatform(value: string): PublicReviewPlatform | null {
  return value === 'google' || value === 'xiaohongshu' ? value : null;
}

export async function generateMetadata({ params }: PublicReviewAgentPageProps): Promise<Metadata> {
  const { merchantSlug, locationSlug, platform: rawPlatform } = await params;
  const page = await getPublicReviewPage(merchantSlug, locationSlug);
  const merchant = page ? merchantFromPublicReviewPage(page) : null;
  const platform = toPlatform(rawPlatform);
  return {
    title: `${merchant?.name || 'Review'} | ${platform === 'google' ? 'Google review' : '小红书体验分享'}`,
    description: merchant ? `Create an authentic review draft for ${merchant.name}.` : 'Create an authentic review draft.',
  };
}

export default async function PublicReviewAgentPage({ params }: PublicReviewAgentPageProps) {
  const { merchantSlug, locationSlug, platform: rawPlatform } = await params;
  const platform = toPlatform(rawPlatform);
  if (!platform) notFound();
  const page = await getPublicReviewPage(merchantSlug, locationSlug);
  if (!page) notFound();
  const merchant = merchantFromPublicReviewPage(page);
  if (!merchant.platforms[platform].enabled) {
    return <ReviewPlatformUnavailable merchant={merchant} platform={platform} />;
  }

  return <ReviewAgent merchant={merchant} platform={platform} />;
}
