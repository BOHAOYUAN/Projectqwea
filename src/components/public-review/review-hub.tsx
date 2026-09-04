"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  MapPin,
  ChevronRight,
  Check,
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
    sublabel: '英文评价 →',
    iconBg: 'bg-[#4285F4]',
    iconColor: 'text-white',
    iconText: 'G',
  },
  {
    key: 'xiaohongshu',
    name: '小红书',
    sublabel: '中文笔记 →',
    iconBg: 'bg-[#FF2442]',
    iconColor: 'text-white',
    iconText: '红',
  },
  {
    key: 'yelp',
    name: 'Yelp',
    sublabel: '评价草稿 →',
    iconBg: 'bg-[#D32323]',
    iconColor: 'text-white',
    iconText: 'Y',
  },
  {
    key: 'instagram',
    name: 'Instagram',
    sublabel: '内容文案 →',
    iconBg: 'bg-gradient-to-tr from-[#FD1D1D] to-[#833AB4]',
    iconColor: 'text-white',
    iconText: 'IG',
  },
];

export function ReviewHub({ merchant }: ReviewHubProps) {
  const router = useRouter();
  const [selectedServiceId, setSelectedServiceId] = useState(merchant.services[0]?.id ?? '');
  const [selectedPlatform, setSelectedPlatform] = useState<PublicReviewPlatform>('google');

  const brandWords = merchant.name.split(/\s+/).filter(Boolean);
  const brandInitials =
    (brandWords[0]?.length && brandWords[0].length <= 2
      ? brandWords[0]
      : brandWords.map((part) => part[0]).join(''))
      .slice(0, 2)
      .toUpperCase() || 'M';

  const handleContinue = () => {
    const base = publicReviewPlatformPath(merchant, selectedPlatform);
    const target = selectedServiceId ? `${base}?service=${encodeURIComponent(selectedServiceId)}` : base;
    router.push(target);
  };

  return (
    <main className="min-h-screen bg-[#ece5dc] px-3.5 py-6 sm:py-10 flex flex-col items-center justify-center font-sans text-[#3c342f]">
      <div className="w-full max-w-[420px] flex flex-col space-y-4">
        {/* TOP BRAND INFO CARD (品牌 / 门店信息) */}
        <section className="rounded-3xl border border-[#d9ccbe] bg-[#f5ede3] p-5 shadow-[0_8px_25px_rgba(80,60,40,0.06)] relative overflow-hidden">
          <div className="flex items-center gap-3.5">
            {/* Logo Avatar */}
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-[#6d503d] font-serif text-xl font-bold border border-[#dfd4c7] shadow-xs">
              {brandInitials}
            </div>
            
            {/* Merchant Details */}
            <div className="flex-1 min-w-0">
              <span className="inline-block text-[10px] font-semibold text-[#a58169] tracking-wider uppercase">
                品牌 / 门店直连
              </span>
              <h1 className="text-xl font-bold text-[#35271f] tracking-tight leading-snug truncate">
                {merchant.name}
              </h1>
              <p className="mt-0.5 text-xs text-[#7e6c60] flex items-center gap-1 line-clamp-1">
                <MapPin className="h-3 w-3 shrink-0 text-[#9e7a63]" />
                <span className="truncate">{merchant.address || merchant.neighborhood}</span>
              </p>
            </div>
          </div>
        </section>

        {/* SECTION TITLE: 留下你的真实体验 */}
        <div className="pt-1 px-1">
          <h2 className="text-sm font-bold text-[#443329] tracking-tight">
            留下你的真实体验
          </h2>
        </div>

        {/* SERVICE SELECTION CARD (本次服务) */}
        {merchant.services.length > 0 && (
          <section className="rounded-2xl border border-[#dec9b5] bg-[#fffaf5] p-3.5 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#564236]">本次服务</span>
              <span className="text-[10px] text-[#9c8475]">点击切换</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {merchant.services.map((service) => {
                const isSelected = selectedServiceId === service.id;
                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => setSelectedServiceId(service.id)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-medium transition active:scale-95 flex items-center gap-1.5 border ${
                      isSelected
                        ? 'border-[#996d51] bg-[#996d51] text-white shadow-xs'
                        : 'border-[#e4d6c7] bg-white text-[#6b5444] hover:bg-[#faf4ee]'
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3 shrink-0" />}
                    <span>{service.name}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* PLATFORM SELECTION (选择发布平台 2x2) */}
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-[#564236]">选择发布平台</h3>
            <span className="text-[10px] text-[#9c8475]">点击选中直接前往</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {PLATFORMS.map((p) => {
              const isEnabled = merchant.platforms[p.key]?.enabled !== false;
              const isSelected = selectedPlatform === p.key;

              return (
                <button
                  key={p.key}
                  type="button"
                  disabled={!isEnabled}
                  onClick={() => {
                    setSelectedPlatform(p.key);
                    const base = publicReviewPlatformPath(merchant, p.key);
                    const target = selectedServiceId ? `${base}?service=${encodeURIComponent(selectedServiceId)}` : base;
                    router.push(target);
                  }}
                  className={`rounded-2xl border p-3.5 text-left transition flex items-center justify-between active:scale-[0.98] ${
                    isSelected
                      ? 'border-[#946548] bg-[#fffaf5] shadow-sm ring-2 ring-[#c69a7c]/30'
                      : 'border-[#decbb8] bg-[#fbf6ef] hover:border-[#c29c81] hover:bg-[#fffcf8]'
                  } ${!isEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-2.5">
                    {/* Platform Icon Badge */}
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-black shadow-xs ${p.iconBg} ${p.iconColor}`}
                    >
                      {p.iconText}
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-[#3d2e25]">
                        {p.name}
                      </span>
                      <span className="block text-[10.5px] text-[#8e7667]">
                        {p.sublabel}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#ab9484] shrink-0" />
                </button>
              );
            })}
          </div>
        </section>

        {/* BOTTOM HELPER NOTICE */}
        <p className="text-center text-[10px] text-[#988273] pt-1 leading-normal">
          统一布局：Logo、色彩、文案、服务和链接可配置
        </p>

        {/* BOTTOM PRIMARY BUTTON: 选择平台继续 */}
        <div className="pt-1">
          <button
            type="button"
            onClick={handleContinue}
            className="w-full rounded-2xl bg-[#7c563e] hover:bg-[#684732] active:scale-[0.99] py-3.5 px-4 text-center text-sm font-bold text-white shadow-md transition flex items-center justify-center gap-2"
          >
            <span>选择平台继续</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </main>
  );
}
