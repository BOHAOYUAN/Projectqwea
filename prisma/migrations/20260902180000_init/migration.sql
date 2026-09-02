-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "MerchantStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('OWNER', 'ADMIN', 'EDITOR', 'ANALYST', 'VIEWER');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('GOOGLE', 'XIAOHONGSHU');

-- CreateEnum
CREATE TYPE "GenerationProvider" AS ENUM ('LOCAL', 'GROQ');

-- CreateEnum
CREATE TYPE "ReplyDraftStatus" AS ENUM ('DRAFT', 'APPROVED', 'SENT', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ReviewSource" AS ENUM ('MANUAL', 'DEMO', 'API');

-- CreateTable
CREATE TABLE "app_users" (
    "id" UUID NOT NULL,
    "email" TEXT,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "app_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchants" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(96) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "industryTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "logoUrl" TEXT,
    "websiteUrl" TEXT,
    "phone" TEXT,
    "brandColor" VARCHAR(32),
    "defaultLocale" VARCHAR(16) NOT NULL DEFAULT 'en-US',
    "status" "MerchantStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "merchants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "merchantId" UUID NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" UUID NOT NULL,
    "merchantId" UUID NOT NULL,
    "slug" VARCHAR(96) NOT NULL,
    "name" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT,
    "region" TEXT,
    "postalCode" TEXT,
    "countryCode" CHAR(2) NOT NULL DEFAULT 'US',
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'America/New_York',
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "phone" TEXT,
    "openingHours" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" UUID NOT NULL,
    "locationId" UUID NOT NULL,
    "slug" VARCHAR(96) NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameZh" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_links" (
    "id" UUID NOT NULL,
    "locationId" UUID NOT NULL,
    "platform" "Platform" NOT NULL,
    "destinationUrl" TEXT,
    "fallbackUrl" TEXT,
    "ctaLabel" TEXT,
    "publishHint" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "platform_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public_page_configs" (
    "id" UUID NOT NULL,
    "locationId" UUID NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "headline" TEXT,
    "subheadline" TEXT,
    "heroImageUrl" TEXT,
    "backgroundImageUrl" TEXT,
    "accentColor" VARCHAR(32),
    "showAddress" BOOLEAN NOT NULL DEFAULT true,
    "showServices" BOOLEAN NOT NULL DEFAULT true,
    "reviewDisclosure" TEXT,
    "xiaohongshuQuery" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "public_page_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_preferences" (
    "id" UUID NOT NULL,
    "locationId" UUID NOT NULL,
    "suggestedTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "googleTone" VARCHAR(240),
    "xiaohongshuTone" VARCHAR(240),
    "forbiddenClaims" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "content_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generation_metrics" (
    "id" UUID NOT NULL,
    "merchantId" UUID NOT NULL,
    "locationId" UUID NOT NULL,
    "serviceId" UUID,
    "platform" "Platform" NOT NULL,
    "provider" "GenerationProvider" NOT NULL DEFAULT 'LOCAL',
    "selectedTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "wasCopied" BOOLEAN NOT NULL DEFAULT false,
    "wasPublishedClick" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generation_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "managed_reviews" (
    "id" UUID NOT NULL,
    "merchantId" UUID NOT NULL,
    "locationId" UUID NOT NULL,
    "platform" "Platform" NOT NULL,
    "source" "ReviewSource" NOT NULL DEFAULT 'MANUAL',
    "externalReviewId" TEXT,
    "reviewerAlias" VARCHAR(160),
    "rating" INTEGER,
    "reviewText" TEXT NOT NULL,
    "reviewedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "managed_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_reply_drafts" (
    "id" UUID NOT NULL,
    "merchantId" UUID NOT NULL,
    "locationId" UUID NOT NULL,
    "reviewId" UUID,
    "createdById" UUID,
    "sourcePlatform" "Platform" NOT NULL,
    "rating" INTEGER,
    "reviewExcerpt" VARCHAR(600),
    "summary" TEXT,
    "draftText" TEXT NOT NULL,
    "status" "ReplyDraftStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "review_reply_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "app_users_email_key" ON "app_users"("email");
CREATE UNIQUE INDEX "merchants_slug_key" ON "merchants"("slug");
CREATE INDEX "merchants_status_idx" ON "merchants"("status");
CREATE INDEX "memberships_merchantId_role_idx" ON "memberships"("merchantId", "role");
CREATE UNIQUE INDEX "memberships_userId_merchantId_key" ON "memberships"("userId", "merchantId");
CREATE INDEX "locations_merchantId_isActive_idx" ON "locations"("merchantId", "isActive");
CREATE UNIQUE INDEX "locations_merchantId_slug_key" ON "locations"("merchantId", "slug");
CREATE INDEX "services_locationId_isActive_displayOrder_idx" ON "services"("locationId", "isActive", "displayOrder");
CREATE UNIQUE INDEX "services_locationId_slug_key" ON "services"("locationId", "slug");
CREATE INDEX "platform_links_platform_isEnabled_idx" ON "platform_links"("platform", "isEnabled");
CREATE UNIQUE INDEX "platform_links_locationId_platform_key" ON "platform_links"("locationId", "platform");
CREATE UNIQUE INDEX "public_page_configs_locationId_key" ON "public_page_configs"("locationId");
CREATE UNIQUE INDEX "content_preferences_locationId_key" ON "content_preferences"("locationId");
CREATE INDEX "generation_metrics_merchantId_createdAt_idx" ON "generation_metrics"("merchantId", "createdAt");
CREATE INDEX "generation_metrics_locationId_platform_createdAt_idx" ON "generation_metrics"("locationId", "platform", "createdAt");
CREATE INDEX "managed_reviews_merchantId_platform_reviewedAt_idx" ON "managed_reviews"("merchantId", "platform", "reviewedAt");
CREATE INDEX "managed_reviews_locationId_source_reviewedAt_idx" ON "managed_reviews"("locationId", "source", "reviewedAt");
CREATE INDEX "review_reply_drafts_merchantId_status_updatedAt_idx" ON "review_reply_drafts"("merchantId", "status", "updatedAt");
CREATE INDEX "review_reply_drafts_locationId_sourcePlatform_updatedAt_idx" ON "review_reply_drafts"("locationId", "sourcePlatform", "updatedAt");
CREATE INDEX "review_reply_drafts_reviewId_idx" ON "review_reply_drafts"("reviewId");

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "locations" ADD CONSTRAINT "locations_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "services" ADD CONSTRAINT "services_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "platform_links" ADD CONSTRAINT "platform_links_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public_page_configs" ADD CONSTRAINT "public_page_configs_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "content_preferences" ADD CONSTRAINT "content_preferences_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "generation_metrics" ADD CONSTRAINT "generation_metrics_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "generation_metrics" ADD CONSTRAINT "generation_metrics_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "generation_metrics" ADD CONSTRAINT "generation_metrics_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "managed_reviews" ADD CONSTRAINT "managed_reviews_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "managed_reviews" ADD CONSTRAINT "managed_reviews_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "review_reply_drafts" ADD CONSTRAINT "review_reply_drafts_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "review_reply_drafts" ADD CONSTRAINT "review_reply_drafts_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "review_reply_drafts" ADD CONSTRAINT "review_reply_drafts_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "managed_reviews"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "review_reply_drafts" ADD CONSTRAINT "review_reply_drafts_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
