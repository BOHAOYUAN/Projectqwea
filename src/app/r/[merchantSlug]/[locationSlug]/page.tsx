import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ReviewHub } from '@/components/public-review/review-hub';
import { merchantFromPublicReviewPage } from '@/components/public-review/public-review-model';
import { getPublicReviewPage } from '@/lib/server/merchant-repository';

type PublicReviewHubPageProps = {
  params: Promise<{ merchantSlug: string; locationSlug: string }>;
};

export async function generateMetadata({ params }: PublicReviewHubPageProps): Promise<Metadata> {
  const { merchantSlug, locationSlug } = await params;
  const page = await getPublicReviewPage(merchantSlug, locationSlug);
  const merchant = page ? merchantFromPublicReviewPage(page) : null;
  return {
    title: merchant ? `${merchant.name} | Share your experience` : 'Share your experience',
    description: merchant
      ? `Share an authentic review for ${merchant.name} in ${merchant.neighborhood}.`
      : 'Share an authentic review in your own words.',
  };
}

export default async function PublicReviewHubPage({ params }: PublicReviewHubPageProps) {
  const { merchantSlug, locationSlug } = await params;
  const page = await getPublicReviewPage(merchantSlug, locationSlug);
  if (!page) notFound();

  return <ReviewHub merchant={merchantFromPublicReviewPage(page)} />;
}
