import { NextRequest, NextResponse } from 'next/server';
import { generateMerchantReply, type ReviewPlatform } from '@/lib/agent/review-generator';
import { toPersistencePlatform } from '@/lib/domain/types';
import { getMerchantAccess, upsertAppUser } from '@/lib/server/merchant-repository';
import { getPrismaClient } from '@/lib/server/prisma';
import { getAuthenticatedSupabaseUser } from '@/lib/server/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      platform?: unknown;
      reviewText?: unknown;
      tone?: unknown;
      merchantSlug?: unknown;
      locationId?: unknown;
      reviewId?: unknown;
      rating?: unknown;
      save?: unknown;
    };
    const platform: ReviewPlatform | null =
      body.platform === 'google' || body.platform === 'xiaohongshu' ? body.platform : null;
    const reviewText = typeof body.reviewText === 'string' ? body.reviewText.trim().slice(0, 1600) : '';
    const tone = typeof body.tone === 'string' ? body.tone.trim().slice(0, 80) : 'warm and thoughtful';
    const merchantSlug = typeof body.merchantSlug === 'string' ? body.merchantSlug.trim() : '';
    const locationId = typeof body.locationId === 'string' ? body.locationId.trim() : '';

    if (!platform || !reviewText || !merchantSlug || !locationId) {
      return NextResponse.json({ error: 'Missing review reply context.' }, { status: 400 });
    }

    const client = getPrismaClient();
    const user = await getAuthenticatedSupabaseUser();
    if (!client || !user) {
      return NextResponse.json({ error: 'Sign in and persistent storage are required to create a reply draft.' }, { status: 401 });
    }
    await upsertAppUser(user);
    const access = await getMerchantAccess(user.id, merchantSlug);
    if (!access || !['owner', 'admin', 'editor'].includes(access.role)) {
      return NextResponse.json({ error: 'You do not have permission to save a reply for this merchant.' }, { status: 403 });
    }
    const location = await client.location.findFirst({
      where: { id: locationId, merchantId: access.merchantId },
      select: { id: true },
    });
    if (!location) return NextResponse.json({ error: 'Location was not found in this merchant.' }, { status: 404 });

    // Reply drafts are an authenticated merchant operation. Always derive the
    // brand name from the scoped membership rather than accepting an arbitrary
    // public payload as an AI prompt.
    const draft = await generateMerchantReply({
      platform,
      merchantName: access.merchantName,
      reviewText,
      tone,
    });
    const shouldSave = body.save === true;

    if (!shouldSave) return NextResponse.json({ success: true, draft });

    const requestedReviewId = typeof body.reviewId === 'string' ? body.reviewId.trim() : '';
    const review = requestedReviewId
      ? await client.managedReview.findFirst({
          where: { id: requestedReviewId, merchantId: access.merchantId, locationId },
          select: { id: true },
        })
      : null;
    const rating = typeof body.rating === 'number' && Number.isInteger(body.rating) && body.rating >= 1 && body.rating <= 5
      ? body.rating
      : null;
    const saved = await client.reviewReplyDraft.create({
      data: {
        merchantId: access.merchantId,
        locationId,
        reviewId: review?.id,
        createdById: user.id,
        sourcePlatform: toPersistencePlatform(platform),
        rating,
        reviewExcerpt: reviewText.slice(0, 600),
        draftText: draft.content,
      },
      select: { id: true, status: true },
    });

    return NextResponse.json({ success: true, draft, savedDraft: { ...saved, status: saved.status.toLowerCase() } });
  } catch {
    return NextResponse.json({ error: 'Unable to create a reply right now.' }, { status: 500 });
  }
}
