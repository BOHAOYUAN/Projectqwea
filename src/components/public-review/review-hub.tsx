"use client";

import Link from 'next/link';
import { useState } from 'react';
import {
  ChevronRight,
  Camera,
  Globe2,
  Heart,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Star,
} from 'lucide-react';
import {
  publicReviewPlatformPath,
  type PublicReviewMerchant,
} from './public-review-model';

type ReviewHubProps = {
  merchant: PublicReviewMerchant;
};

export function ReviewHub({ merchant }: ReviewHubProps) {
  const [selectedServiceId, setSelectedServiceId] = useState(merchant.services[0]?.id ?? '');
  const withService = (platform: 'google' | 'xiaohongshu' | 'yelp' | 'instagram') => {
    const base = publicReviewPlatformPath(merchant, platform);
    return selectedServiceId ? `${base}?service=${encodeURIComponent(selectedServiceId)}` : base;
  };
  const googleHref = withService('google');
  const xiaohongshuHref = withService('xiaohongshu');
  const yelpHref = withService('yelp');
  const instagramHref = withService('instagram');
  const brandWords = merchant.name
    .split(/\s+/)
    .filter(Boolean)
  const brandInitials = (brandWords[0]?.length && brandWords[0].length <= 2
    ? brandWords[0]
    : brandWords.map((part) => part[0]).join(''))
    .slice(0, 2)
    .toUpperCase() || 'RV';

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#f7f3eb] px-4 py-8 text-[#44362d] sm:px-6 sm:py-12">
      <div aria-hidden className="absolute inset-0 -z-10 opacity-70">
        <div className="absolute -left-24 top-14 h-72 w-72 rounded-full bg-[#eed7b4] blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-[#e9cbb5]/70 blur-3xl" />
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/60" />
      </div>

      <section className="mx-auto flex w-full max-w-3xl flex-col items-center">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#b99573]/45 bg-[#fffaf2]/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8b614a] shadow-sm backdrop-blur sm:mb-10">
          <Sparkles className="h-3.5 w-3.5" />
          A moment for you
        </div>

        <header className="max-w-xl text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[2rem] border border-[#b58c6b]/35 bg-[#fffaf5] shadow-[0_14px_32px_rgba(103,71,48,0.14)]">
            <span className="font-serif text-3xl tracking-[-0.14em] text-[#8e604a]">{brandInitials}</span>
          </div>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.26em] text-[#a47658]">{merchant.industryLabel}</p>
          <h1 className="font-serif text-4xl leading-none tracking-[-0.055em] text-[#382a22] sm:text-5xl">{merchant.name}</h1>
          <p className="mt-5 font-serif text-xl leading-relaxed text-[#805a48] sm:text-2xl">{merchant.headline || 'How was your time with us?'}</p>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#735e51]">{merchant.subheadline || merchant.description}</p>
          {merchant.showAddress !== false && (
            <p className="mt-5 inline-flex items-center gap-1.5 text-xs text-[#765f51]">
              <MapPin className="h-3.5 w-3.5 text-[#a97558]" />
              <span>{merchant.address}</span>
            </p>
          )}
        </header>

        {merchant.services.length > 0 && (
          <section className="mt-10 w-full max-w-2xl rounded-[1.75rem] border border-[#e5d8c8] bg-[#fffaf4]/90 p-5 shadow-[0_12px_28px_rgba(103,71,48,0.06)] sm:mt-12 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a47658]">01 · Your visit</p>
                <h2 className="mt-1 font-serif text-2xl text-[#382a22]">What did you experience?</h2>
              </div>
              <p className="text-xs text-[#806a5c]">Choose one to guide your draft</p>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {merchant.services.map((service) => {
                const selected = selectedServiceId === service.id;
                return (
                  <button
                    key={service.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setSelectedServiceId(service.id)}
                    className={`rounded-2xl border p-3 text-left transition ${selected ? 'border-[#9d6d50] bg-[#f3e4d2] shadow-sm' : 'border-[#eadbcb] bg-white hover:border-[#c9a789] hover:bg-[#fffdf9]'}`}
                  >
                    <span className="block text-sm font-semibold text-[#4a382d]">{service.name}</span>
                    <span className="mt-1 block text-[11px] leading-4 text-[#877365]">{service.englishName}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <div className="mt-6 w-full max-w-2xl sm:mt-8">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#9d765d] text-[11px] font-bold text-white">02</span>
            <div>
              <p className="text-sm font-semibold text-[#4a382d]">Choose where to share</p>
              <p className="text-xs text-[#806a5c]">We will only turn the details you choose into a draft.</p>
            </div>
          </div>
          <div className="grid w-full gap-4 sm:grid-cols-2">
          <PlatformLink
            href={googleHref}
            available={merchant.platforms.google.enabled}
            icon={<Globe2 className="h-6 w-6" />}
            eyebrow="Google Maps"
            title="Write a Google review"
            description="Create an authentic English review, then decide what to publish."
            className="border-[#b9cdec] from-white to-[#f3f7ff] text-[#2b5caa] hover:border-[#7fa6e5]"
          />
          <PlatformLink
            href={xiaohongshuHref}
            available={merchant.platforms.xiaohongshu.enabled}
            icon={<span className="text-base font-black leading-none">小红书</span>}
            eyebrow="Xiaohongshu"
            title="分享一篇小红书笔记"
            description="把真实感受整理成有温度的中文体验分享。"
            className="border-[#f2b8bd] from-white to-[#fff4f4] text-[#d64d59] hover:border-[#e77c85]"
          />
          <PlatformLink
            href={yelpHref}
            available={merchant.platforms.yelp.enabled}
            icon={<span className="font-serif text-2xl font-bold leading-none">Y</span>}
            eyebrow="Yelp"
            title="Write a Yelp review"
            description="Shape an honest English review, then decide what to post."
            className="border-[#f1c0bd] from-white to-[#fff7f4] text-[#c74a40] hover:border-[#dd827b]"
          />
          <PlatformLink
            href={instagramHref}
            available={merchant.platforms.instagram.enabled}
            icon={<Camera className="h-6 w-6" />}
            eyebrow="Instagram"
            title="Create an Instagram caption"
            description="Turn the details you choose into a grounded caption for your own post."
            className="border-[#e7bce2] from-white to-[#fff5fb] text-[#b84899] hover:border-[#d982c5]"
          />
          </div>
        </div>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-[#806a5c]">
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-[#9a765d]" /> You always review before posting</span>
          <span className="inline-flex items-center gap-1.5"><Heart className="h-4 w-4 text-[#9a765d]" /> Your words stay yours</span>
        </div>

        <div className="mt-12 flex items-center gap-2 text-[11px] font-medium text-[#9a8170] sm:mt-16">
          <Star className="h-3.5 w-3.5 fill-[#c99968] text-[#c99968]" />
          <span>Thank you for choosing {merchant.name}</span>
        </div>
      </section>
    </main>
  );
}

type PlatformLinkProps = {
  href: string;
  available: boolean;
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  className: string;
};

function PlatformLink({ href, available, icon, eyebrow, title, description, className }: PlatformLinkProps) {
  const body = (
    <>
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/90 shadow-sm ring-1 ring-black/5">
        {icon}
      </div>
      <p className="mt-7 text-[10px] font-bold uppercase tracking-[0.2em] opacity-75">{eyebrow}</p>
      <h2 className="mt-2 font-serif text-2xl leading-tight text-[#372922]">{title}</h2>
      <p className="mt-3 max-w-xs text-sm leading-6 text-[#715f55]">{available ? description : 'This option is not available for this location yet.'}</p>
      {available ? (
        <span className="absolute bottom-6 right-6 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm transition group-hover:translate-x-1">
          <ChevronRight className="h-5 w-5" />
        </span>
      ) : (
        <span className="absolute bottom-6 left-6 rounded-full border border-[#dec9b5] bg-white/75 px-3 py-1.5 text-[10px] font-bold text-[#856a58]">Not available</span>
      )}
      <MessageCircle aria-hidden className="absolute -bottom-9 -right-8 h-40 w-40 rotate-[-12deg] opacity-[0.055]" />
    </>
  );

  const classNameValue = `group relative min-h-64 overflow-hidden rounded-[2rem] border bg-gradient-to-br p-6 shadow-[0_14px_32px_rgba(103,71,48,0.08)] transition duration-300 ${available ? 'hover:-translate-y-1 hover:shadow-[0_18px_42px_rgba(103,71,48,0.15)]' : 'cursor-not-allowed opacity-70'} ${className}`;

  if (!available) {
    return <div aria-disabled="true" className={classNameValue}>{body}</div>;
  }

  return (
    <Link
      href={href}
      className={classNameValue}
    >
      {body}
    </Link>
  );
}
