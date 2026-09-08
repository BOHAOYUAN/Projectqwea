"use client";

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  MapPin,
  ChevronRight,
} from 'lucide-react';
import {
  publicReviewPlatformPath,
  type PublicReviewMerchant,
  type PublicReviewPlatform,
} from './public-review-model';

type ReviewHubProps = {
  merchant: PublicReviewMerchant;
};

type PlatformCardInfo = {
  key: PublicReviewPlatform;
  name: string;
  sublabel: string;
  ctaLabel: string;
  iconBg: string;
  iconColor: string;
  iconText: string;
};

const PLATFORMS: PlatformCardInfo[] = [
  {
    key: 'google',
    name: 'Google',
    sublabel: 'Google review',
    ctaLabel: 'Write a review',
    iconBg: 'bg-white',
    iconColor: 'text-[#4285F4]',
    iconText: 'G',
  },
  {
    key: 'xiaohongshu',
    name: 'RedNote',
    sublabel: 'RedNote post',
    ctaLabel: 'Create a post',
    iconBg: 'bg-[#FF2442]',
    iconColor: 'text-white',
    iconText: 'R',
  },
  {
    key: 'yelp',
    name: 'Yelp',
    sublabel: 'Yelp review',
    ctaLabel: 'Write a review',
    iconBg: 'bg-[#ed4057]',
    iconColor: 'text-white',
    iconText: 'Y',
  },
  {
    key: 'instagram',
    name: 'Instagram',
    sublabel: 'Instagram post',
    ctaLabel: 'Create a post',
    iconBg: 'bg-gradient-to-tr from-[#FD1D1D] to-[#833AB4]',
    iconColor: 'text-white',
    iconText: 'IG',
  },
];

export function ReviewHub({ merchant }: ReviewHubProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Selected platform: null by default per acceptance #9 ("未选平台时底部按钮置灰不可点")
  const [selectedPlatform, setSelectedPlatform] = useState<PublicReviewPlatform | null>(null);

  // Theme support: default to merchant.theme, allow query override ?theme=dark / ?theme=light or manual toggle
  const theme = searchParams?.get('theme') === 'light' || searchParams?.get('theme') === 'dark'
    ? (searchParams.get('theme') as 'dark' | 'light')
    : (merchant.theme || 'dark');

  const isDark = theme === 'dark';

  const brandWords = merchant.name.split(/\s+/).filter(Boolean);
  const brandInitials =
    (brandWords[0]?.length && brandWords[0].length <= 2
      ? brandWords[0]
      : brandWords.map((part) => part[0]).join(''))
      .slice(0, 2)
      .toUpperCase() || 'M';
  const displayName = merchant.name === merchant.name.toUpperCase()
    ? merchant.name.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())
    : merchant.name;

  // Filter only enabled platforms per acceptance #5: "平台卡只显示后台已启用的，未启用的不出现"
  const enabledPlatforms = useMemo(() => {
    return PLATFORMS.filter((p) => merchant.platforms[p.key]?.enabled !== false);
  }, [merchant.platforms]);

  const handleSelectPlatform = (platformKey: PublicReviewPlatform) => {
    setSelectedPlatform(platformKey);
  };

  const handleContinue = () => {
    if (!selectedPlatform) return;
    const target = publicReviewPlatformPath(merchant, selectedPlatform);
    router.push(target);
  };

  const selectedPlatformName = useMemo(() => {
    if (!selectedPlatform) return '';
    const found = PLATFORMS.find((p) => p.key === selectedPlatform);
    return found ? found.name : '';
  }, [selectedPlatform]);

  return (
    <main
      className={`min-h-screen font-sans transition-colors duration-300 ${
        isDark ? 'bg-[#090a08] text-[#f4f0e6]' : 'bg-[#f4f4f4] text-[#161616]'
      }`}
    >
      <div className="relative mx-auto min-h-screen w-full max-w-[430px] overflow-hidden">
        <div className={`absolute inset-x-0 top-0 h-[260px] ${isDark ? 'bg-[#ffc400]' : 'bg-[#f6cc48]'}`}>
          {merchant.bannerUrl && (
            <img
              src={merchant.bannerUrl}
              alt={`${merchant.name} interior`}
              className="h-full w-full object-cover object-center"
            />
          )}
          <div
            aria-hidden="true"
            className={`absolute inset-0 ${
              isDark
                ? 'bg-[linear-gradient(180deg,rgba(0,0,0,0.04)_40%,rgba(0,0,0,0.72)_100%)]'
                : 'bg-[linear-gradient(180deg,rgba(255,255,255,0)_45%,rgba(255,255,255,0.42)_100%)]'
            }`}
          />
        </div>

        <div className="relative pt-[180px]">
        <div className={`min-h-screen rounded-t-[34px] px-4 pb-8 ${
          isDark ? 'bg-[#000] text-[#f4f0e6]' : 'bg-white text-[#161616]'
        }`}>
          {/* Merchant identity card */}
          <section className="relative h-[262px]">
            <div
              className={`absolute inset-x-1 top-6 h-[212px] rounded-[28px] px-5 pt-7 text-center shadow-[0_18px_40px_rgba(0,0,0,0.30)] ${
              isDark
                ? 'border border-white/5 bg-[radial-gradient(circle_at_52%_-10%,rgba(211,181,25,0.68),rgba(31,32,28,0.98)_44%,#1b1c1a_100%)] text-white'
                : 'border border-[#ffc400] bg-[#ffc400] text-[#171715]'
            }`}
          >
            <div className="mx-auto mb-4 flex h-[68px] w-[68px] items-center justify-center overflow-hidden rounded-full border-2 border-white bg-white font-serif text-xl font-bold text-[#151515] shadow-md">
              {merchant.logoUrl ? (
                <img src={merchant.logoUrl} alt={merchant.name} className="h-full w-full object-cover" />
              ) : (
                <span className="font-black tracking-[-0.1em] text-[#111]">{brandInitials}</span>
              )}
            </div>
            <h1 className="text-[18px] font-medium tracking-tight">{displayName}</h1>
            <p className={`mt-3 flex items-center justify-center gap-1 text-[10px] ${isDark ? 'text-[#ecebe7]' : 'font-semibold text-[#282612]'}`}>
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{merchant.address || merchant.neighborhood}</span>
            </p>
          </div>
          </section>

        {/* Platform selection */}
        <section className="space-y-3 pt-1">
          <h2 className={`px-1 text-[12px] font-medium ${isDark ? 'text-[#efeee9]' : 'text-[#27251f]'}`}>
            Choose a publishing platform
          </h2>

          {/* 2x2 Platform Grid (Only shows enabled platforms per acceptance #5) */}
          <div className="grid grid-cols-2 gap-2.5">
            {enabledPlatforms.map((p) => {
              const isSelected = selectedPlatform === p.key;

              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => handleSelectPlatform(p.key)}
                  className={`relative flex h-[103px] flex-col items-center justify-between rounded-[19px] border px-2 py-2.5 text-center transition active:scale-[0.98] ${
                    isDark
                      ? isSelected
                        ? 'border-[#ffd13f] bg-[radial-gradient(circle_at_50%_0%,#777b4d,#383a2d_58%,#242527)] ring-1 ring-[#ffd13f]/70'
                        : 'border-white/5 bg-[radial-gradient(circle_at_50%_0%,#777b4d,#34352d_55%,#252629)] hover:border-[#ffd13f]/50'
                      : isSelected
                        ? 'border-[#e6ae19] bg-[#fff9df] ring-1 ring-[#e6ae19]/60'
                        : 'border-[#dedbd0] bg-white hover:border-[#e6ae19]/60 shadow-[0_2px_5px_rgba(67,55,22,0.06)]'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    {/* Platform Icon Badge */}
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-black shadow-sm ${p.iconBg} ${p.iconColor}`}
                    >
                      {p.iconText}
                    </div>
                    <div className="min-w-0">
                      <span className={`block truncate text-[9px] font-medium ${isDark ? 'text-[#f8f6ef]' : 'text-zinc-900'}`}>
                        {p.name}
                      </span>
                      <span className={`block truncate text-[8px] ${isDark ? 'text-[#e6e6e0]' : 'text-zinc-500'}`}>
                        {p.sublabel}
                      </span>
                    </div>
                  </div>
                  <span className={`inline-flex w-full items-center justify-center rounded-full px-3 py-[4px] text-[8px] font-medium ${
                    isDark ? 'bg-[#ffd13f] text-[#15150f]' : 'bg-[#ffd13f] text-[#15150f]'
                  }`}>
                    {p.ctaLabel}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Primary action: disabled until a platform is selected. */}
          <div className="pt-2">
            <button
              type="button"
              disabled={!selectedPlatform}
              onClick={handleContinue}
              className={`flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-center text-[12px] font-medium transition ${
                !selectedPlatform
                  ? isDark
                    ? 'cursor-not-allowed bg-[linear-gradient(90deg,#303238,#424537,#69623c)] text-[#e8e7e0] shadow-none'
                    : 'cursor-not-allowed bg-[#e5e3dc] text-[#aaa79f] shadow-none'
                  : isDark
                    ? 'bg-[#ffd13f] text-[#171711] hover:brightness-105 active:scale-[0.99]'
                    : 'bg-[#11120f] text-white hover:bg-black active:scale-[0.99]'
              }`}
            >
              <span>
                {selectedPlatform
                  ? `Continue to ${selectedPlatformName}`
                  : 'Select a platform'}
              </span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </section>

        {/* Social links are shown only when the merchant has configured them. */}
        {merchant.socialLinks && merchant.socialLinks.length > 0 && (
          <section className="space-y-3 pt-5">
            <h2 className={`text-[12px] font-medium ${isDark ? 'text-[#efeee9]' : 'text-[#292720]'}`}>
              Follow us
            </h2>

            <div className={`space-y-2 rounded-[22px] p-3 ${
              isDark
                ? 'bg-[radial-gradient(circle_at_70%_0%,#68633a,#373832_44%,#252625_100%)]'
                : 'bg-[#e7e7e1]'
            }`}>
              {merchant.socialLinks.map((social) => {
                const isXhs = social.platform === 'xiaohongshu';
                const isIg = social.platform === 'instagram';

                const iconStyle = isXhs
                  ? 'bg-[#FF2442] text-white'
                  : isIg
                    ? 'bg-gradient-to-tr from-[#FD1D1D] to-[#833AB4] text-white'
                    : 'bg-zinc-900 text-cyan-400 border border-zinc-700';

                const iconText = isXhs ? 'R' : isIg ? 'IG' : 'TK';

                return (
                  <div
                    key={social.platform}
                    className={`flex items-center justify-between rounded-full px-2.5 py-1.5 transition ${
                      isDark
                        ? 'bg-[#515151] text-zinc-100'
                        : 'bg-[#ffc400] text-zinc-900'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[9px] font-black shadow-xs ${iconStyle}`}
                      >
                        {iconText}
                      </div>
                      <div className="min-w-0">
                        <span className={`block truncate text-[10px] font-bold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                          {social.platform === 'xiaohongshu'
                            ? 'RedNote'
                            : social.platform === 'instagram'
                              ? 'Instagram'
                              : 'TikTok'}
                        </span>
                        <span className={`block truncate text-[8px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                          {social.handle}
                        </span>
                      </div>
                    </div>

                    <a
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex shrink-0 items-center justify-center rounded-full px-8 py-1 text-[9px] font-bold transition active:scale-95 ${
                        isDark
                          ? 'bg-[#ffd13f] text-zinc-950 hover:bg-[#e6b92f]'
                          : 'bg-[#11120f] text-white hover:bg-black'
                      }`}
                    >
                      <span>Follow</span>
                    </a>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Merchant gallery */}
        {merchant.galleryImages && merchant.galleryImages.length > 0 && (
          <section className="pt-6">
            <div className="grid grid-cols-2 gap-3">
              {merchant.galleryImages.map((imgUrl, idx) => (
                <div
                  key={idx}
                  className={`relative h-[176px] overflow-hidden rounded-[18px] border-[6px] ${
                    isDark ? 'border-[#30312e] bg-[#161713]' : 'border-[#ffc400] bg-[#fff9de]'
                  }`}
                >
                  <img
                    src={imgUrl}
                    alt={`${merchant.name} gallery image ${idx + 1}`}
                    className="h-full w-full object-cover object-center transition duration-300 hover:scale-105"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* FOOTER: POINTHUB 标识 (验收 #2) */}
        <footer className="pt-8 pb-2 text-center">
          <p
            className={`text-[14px] font-black tracking-[-0.06em] uppercase transition ${
              isDark ? 'text-[#ffd13f]' : 'text-[#181814]'
            }`}
          >
            POINTHUB
          </p>
          <p className={`mt-1 text-[9px] ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
            Smart Review &amp; Experience Sharing
          </p>
        </footer>

        </div>
        </div>
      </div>
    </main>
  );
}
