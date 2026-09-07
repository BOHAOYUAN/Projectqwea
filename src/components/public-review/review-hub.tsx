"use client";

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  MapPin,
  ChevronRight,
  ExternalLink,
  Moon,
  Sun,
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
  iconBg: string;
  iconColor: string;
  iconText: string;
};

const PLATFORMS: PlatformCardInfo[] = [
  {
    key: 'google',
    name: 'Google',
    sublabel: 'Write a Review',
    iconBg: 'bg-[#4285F4]',
    iconColor: 'text-white',
    iconText: 'G',
  },
  {
    key: 'xiaohongshu',
    name: '小红书',
    sublabel: '去发布笔记',
    iconBg: 'bg-[#FF2442]',
    iconColor: 'text-white',
    iconText: '红',
  },
  {
    key: 'yelp',
    name: 'Yelp',
    sublabel: 'Write a Review',
    iconBg: 'bg-[#D32323]',
    iconColor: 'text-white',
    iconText: 'Y',
  },
  {
    key: 'instagram',
    name: 'Instagram',
    sublabel: 'Post a Story',
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
  const initialTheme = searchParams?.get('theme') === 'light' || searchParams?.get('theme') === 'dark'
    ? (searchParams.get('theme') as 'dark' | 'light')
    : (merchant.theme || 'dark');
  const [theme, setTheme] = useState<'dark' | 'light'>(initialTheme);

  const isDark = theme === 'dark';

  const brandWords = merchant.name.split(/\s+/).filter(Boolean);
  const brandInitials =
    (brandWords[0]?.length && brandWords[0].length <= 2
      ? brandWords[0]
      : brandWords.map((part) => part[0]).join(''))
      .slice(0, 2)
      .toUpperCase() || 'M';

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
      className={`min-h-screen px-4 py-4 sm:py-8 flex flex-col items-center justify-start font-sans transition-colors duration-300 ${
        isDark ? 'bg-[#0f0f10] text-[#e4e4e7]' : 'bg-[#f4f4f6] text-[#27272a]'
      }`}
    >
      <div className="w-full max-w-[420px] flex flex-col space-y-4 pb-8">
        
        {/* THEME TOGGLE (Discreet helper so Cindy / clients can test both black and white themes) */}
        <div className="flex items-center justify-between px-1 text-xs">
          <span className={`text-[11px] font-medium tracking-wide ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            POINTHUB CLIENT FLOW
          </span>
          <button
            type="button"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition border ${
              isDark
                ? 'bg-zinc-900/90 text-amber-300 border-zinc-800 hover:bg-zinc-800'
                : 'bg-white text-zinc-700 border-zinc-200 shadow-xs hover:bg-zinc-50'
            }`}
          >
            {isDark ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
            <span>{isDark ? '浅色模式' : '深色模式'}</span>
          </button>
        </div>

        {/* TOP HERO BANNER & MERCHANT CARD (红框 1: 商家动态信息) */}
        <div className="relative overflow-hidden rounded-3xl shadow-lg border border-black/5">
          {/* Header Store Banner Image */}
          {merchant.bannerUrl && (
            <div className="relative h-32 w-full overflow-hidden">
              <img
                src={merchant.bannerUrl}
                alt={merchant.name}
                className="h-full w-full object-cover object-center brightness-[0.85]"
              />
              <div
                className={`absolute inset-0 bg-gradient-to-b ${
                  isDark ? 'from-transparent via-[#1a1a1c]/60 to-[#1a1a1c]' : 'from-transparent via-[#f5a623]/20 to-[#f5a623]'
                }`}
              />
            </div>
          )}

          {/* Merchant Info Body */}
          <section
            className={`p-5 text-center relative ${
              isDark
                ? 'bg-[#1a1a1c] border-t border-zinc-800/80 text-zinc-100'
                : 'bg-[#f5a623] text-zinc-900 shadow-inner'
            }`}
          >
            {/* Logo Avatar (Centered) */}
            <div className="mx-auto -mt-11 mb-2.5 flex h-16 w-16 items-center justify-center rounded-full bg-white text-zinc-900 font-serif text-xl font-bold shadow-md border-2 border-white/80 overflow-hidden">
              {merchant.logoUrl ? (
                <img src={merchant.logoUrl} alt={merchant.name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-[#a46e29] font-black">{brandInitials}</span>
              )}
            </div>

            {/* Merchant Name */}
            <h1 className="text-xl font-black tracking-tight leading-snug">
              {merchant.name}
            </h1>

            {/* Merchant Address & Hours */}
            <p
              className={`mt-1 text-xs flex items-center justify-center gap-1.5 px-2 ${
                isDark ? 'text-zinc-400' : 'text-zinc-800/90 font-medium'
              }`}
            >
              <MapPin className="h-3 w-3 shrink-0 opacity-80" />
              <span className="truncate">{merchant.address || merchant.neighborhood}</span>
            </p>
          </section>
        </div>

        {/* SECTION: 选择发布平台 */}
        <section className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between px-1">
            <h2 className={`text-xs font-bold tracking-tight ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
              选择发布平台
            </h2>
            <span className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              点击选择
            </span>
          </div>

          {/* 2x2 Platform Grid (Only shows enabled platforms per acceptance #5) */}
          <div className="grid grid-cols-2 gap-2.5">
            {enabledPlatforms.map((p) => {
              const isSelected = selectedPlatform === p.key;

              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => handleSelectPlatform(p.key)}
                  className={`rounded-2xl p-3.5 text-left transition relative flex flex-col justify-between active:scale-[0.98] border ${
                    isDark
                      ? isSelected
                        ? 'border-[#f5a623] bg-[#272118] shadow-[0_0_15px_rgba(245,166,35,0.15)] ring-1 ring-[#f5a623]/60'
                        : 'border-zinc-800 bg-[#1c1c1f] hover:border-zinc-700'
                      : isSelected
                        ? 'border-[#f5a623] bg-[#fffaf0] shadow-sm ring-2 ring-[#f5a623]/30'
                        : 'border-zinc-200 bg-white hover:border-zinc-300 shadow-xs'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {/* Platform Icon Badge */}
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-black shadow-xs ${p.iconBg} ${p.iconColor}`}
                    >
                      {p.iconText}
                    </div>
                    <div className="min-w-0">
                      <span className={`block text-xs font-bold truncate ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                        {p.name}
                      </span>
                      <span className={`block text-[10.5px] truncate ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        {p.sublabel}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* PRIMARY ACTION BUTTON (验收 #9 & #10: 未选置灰不可点，选中显示"继续前往 ...") */}
          <div className="pt-1.5">
            <button
              type="button"
              disabled={!selectedPlatform}
              onClick={handleContinue}
              className={`w-full rounded-2xl py-3.5 px-4 text-center text-sm font-bold transition flex items-center justify-center gap-2 shadow-md ${
                !selectedPlatform
                  ? isDark
                    ? 'bg-zinc-800/80 text-zinc-500 cursor-not-allowed border border-zinc-700/40 shadow-none'
                    : 'bg-zinc-200 text-zinc-400 cursor-not-allowed border border-zinc-200 shadow-none'
                  : isDark
                    ? 'bg-gradient-to-r from-[#e5a93b] to-[#f5b842] text-zinc-950 hover:brightness-105 active:scale-[0.99] font-black'
                    : 'bg-zinc-900 hover:bg-black text-white active:scale-[0.99] font-black'
              }`}
            >
              <span>
                {selectedPlatform
                  ? `继续前往 ${selectedPlatformName}`
                  : '请选择平台'}
              </span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </section>

        {/* SECTION: 关注我们 (红框 2: 仅在已配置账号时显示，验收 #6) */}
        {merchant.socialLinks && merchant.socialLinks.length > 0 && (
          <section className="space-y-2 pt-2">
            <div className="flex items-center justify-between px-1">
              <h2 className={`text-xs font-bold tracking-tight ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                关注我们
              </h2>
            </div>

            <div className="space-y-2">
              {merchant.socialLinks.map((social) => {
                const isXhs = social.platform === 'xiaohongshu';
                const isIg = social.platform === 'instagram';

                const iconStyle = isXhs
                  ? 'bg-[#FF2442] text-white'
                  : isIg
                    ? 'bg-gradient-to-tr from-[#FD1D1D] to-[#833AB4] text-white'
                    : 'bg-zinc-900 text-cyan-400 border border-zinc-700';

                const iconText = isXhs ? '红' : isIg ? 'IG' : 'TK';

                return (
                  <div
                    key={social.platform}
                    className={`rounded-2xl p-3 flex items-center justify-between border transition ${
                      isDark
                        ? 'bg-[#1c1c1f] border-zinc-800/90 text-zinc-100'
                        : 'bg-white border-zinc-200 text-zinc-900 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-black shadow-xs ${iconStyle}`}
                      >
                        {iconText}
                      </div>
                      <div className="min-w-0">
                        <span className={`block text-xs font-bold truncate ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                          {social.platform === 'xiaohongshu'
                            ? '小红书'
                            : social.platform === 'instagram'
                              ? 'Instagram'
                              : 'TikTok'}
                        </span>
                        <span className={`block text-[11px] truncate ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                          {social.handle}
                        </span>
                      </div>
                    </div>

                    <a
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-1 rounded-full px-3.5 py-1 text-xs font-bold transition active:scale-95 shrink-0 ${
                        isDark
                          ? 'bg-[#f5a623] hover:bg-[#e0961b] text-zinc-950 shadow-xs'
                          : 'bg-[#f5a623] hover:bg-[#e0961b] text-zinc-950 shadow-xs'
                      }`}
                    >
                      <span>关注</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* SECTION: 宣传图 / 门店环境 (红框 3: 有上传显示，没上传整块不显示，验收 #7) */}
        {merchant.galleryImages && merchant.galleryImages.length > 0 && (
          <section className="space-y-2 pt-2">
            <div className="flex items-center justify-between px-1">
              <h2 className={`text-xs font-bold tracking-tight ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                门店环境
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {merchant.galleryImages.map((imgUrl, idx) => (
                <div
                  key={idx}
                  className={`overflow-hidden rounded-2xl h-32 relative border shadow-xs ${
                    isDark ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-200 bg-zinc-100'
                  }`}
                >
                  <img
                    src={imgUrl}
                    alt={`${merchant.name} 宣传图 ${idx + 1}`}
                    className="h-full w-full object-cover object-center transition duration-300 hover:scale-105"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* FOOTER: POINTHUB 标识 (验收 #2) */}
        <footer className="pt-6 pb-2 text-center">
          <p
            className={`text-xs font-black tracking-[0.22em] uppercase transition ${
              isDark ? 'text-[#f5a623]/80' : 'text-zinc-900/80'
            }`}
          >
            POINTHUB
          </p>
          <p className={`mt-0.5 text-[10px] ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
            Smart Review & Experience Sharing
          </p>
        </footer>

      </div>
    </main>
  );
}
