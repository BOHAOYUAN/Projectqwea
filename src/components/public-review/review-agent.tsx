'use client';

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  Globe2,
  Loader2,
  MapPin,
  MessageCircleHeart,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  WandSparkles,
} from 'lucide-react';
import {
  publicReviewPath,
  type PublicReviewMerchant,
  type PublicReviewPlatform,
  type PublicReviewService,
} from './public-review-model';

type ReviewAgentProps = {
  merchant: PublicReviewMerchant;
  platform: PublicReviewPlatform;
};

type ApiDraft = {
  content?: string;
};

const maxSelectedServices = 2;

export function ReviewAgent({ merchant, platform }: ReviewAgentProps) {
  const isGoogle = platform === 'google';
  const [experience, setExperience] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState('');
  const [variation, setVariation] = useState(0);
  const [metricId, setMetricId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selectedServices = useMemo(
    () => merchant.services.filter((service) => selectedServiceIds.includes(service.id)),
    [merchant.services, selectedServiceIds],
  );
  const selectedTags = useMemo(
    () => merchant.experienceTags.filter((tag) => selectedTagIds.includes(tag.id)),
    [merchant.experienceTags, selectedTagIds],
  );

  const labels = isGoogle
    ? {
        heading: 'Tell your story, in your own words.',
        subheading: 'Our review assistant will make a natural English draft from only what you choose to share.',
        experienceLabel: 'What would you like to mention?',
        experienceHint: 'For example: what felt especially thoughtful, calm, or memorable?',
        serviceLabel: 'Which service did you try?',
        tagLabel: 'Choose any feelings that fit',
        generate: 'Create my review draft',
        refresh: 'Try another version',
        draftLabel: 'Your review draft',
        draftHint: 'Edit anything until it sounds like you.',
        copyAndOpen: 'Copy & open Google Maps',
        guardrail: 'Please read and edit your review before sharing. Nothing is posted automatically.',
      }
    : {
        heading: '把这次体验说给 AI 听吧。',
        subheading: '我们会只根据你的真实感受，整理成一篇自然、有温度的小红书笔记。',
        experienceLabel: '这次最想分享什么？',
        experienceHint: '例如：哪一个细节让你觉得舒服、放松或被照顾到？',
        serviceLabel: '这次体验了什么项目？',
        tagLabel: '可多选，挑选贴近你的感受',
        generate: '生成我的笔记草稿',
        refresh: '换一个写法',
        draftLabel: '你的笔记草稿',
        draftHint: '可以直接修改，让它更像你本人。',
        copyAndOpen: '复制并前往小红书',
        guardrail: '发布前请仔细核对和修改。页面不会自动替你发布。',
      };

  const toggleService = (serviceId: string) => {
    setError('');
    setSelectedServiceIds((current) => {
      if (current.includes(serviceId)) return current.filter((id) => id !== serviceId);
      if (current.length >= maxSelectedServices) return current;
      return [...current, serviceId];
    });
  };

  const toggleTag = (tagId: string) => {
    setError('');
    setSelectedTagIds((current) =>
      current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId],
    );
  };

  const generateDraft = async (nextVariation = variation + 1) => {
    if (!experience.trim() && selectedServices.length === 0 && selectedTags.length === 0) {
      setError(
        isGoogle
          ? 'Add a detail, service, or feeling first so the draft can stay true to your visit.'
          : '先写下一点感受，或选择项目和体验标签，让文案更贴近这次到店体验。',
      );
      return;
    }

    setIsGenerating(true);
    setError('');
    setIsCopied(false);
    setVariation(nextVariation);

    const payload = {
      platform,
      merchantName: merchant.name,
      location: merchant.address,
      merchantSlug: merchant.merchantSlug,
      locationSlug: merchant.locationSlug,
      serviceNames: selectedServices.map((service) => (isGoogle ? service.englishName : service.name)),
      serviceSlugs: selectedServices.map((service) => service.id),
      tags: selectedTags.map((tag) => (isGoogle ? tag.googleLabel : tag.label)),
      experience: experience.trim(),
      seed: Date.now() + nextVariation,
    };

    try {
      const response = await fetch('/api/review-drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as {
        success?: boolean;
        draft?: ApiDraft | string;
        review?: string;
        metricId?: string | null;
        error?: string;
      };
      const apiDraft = typeof data.draft === 'string' ? data.draft : data.draft?.content;

      if (!response.ok || !data.success || !(apiDraft || data.review)) {
        throw new Error(data.error || 'Unable to create a draft right now.');
      }

      setDraft(apiDraft || data.review || '');
      setMetricId(data.metricId || null);
    } catch {
      // The public flow remains usable in local/demo deployments when the API is not configured yet.
      setDraft(buildLocalDraft({ platform, merchant, services: selectedServices, tags: selectedTags.map((tag) => isGoogle ? tag.googleLabel : tag.label), experience }));
      setMetricId(null);
    } finally {
      setIsGenerating(false);
      window.setTimeout(() => textareaRef.current?.focus(), 0);
    }
  };

  const copyAndOpen = async () => {
    if (!draft.trim()) {
      setError(isGoogle ? 'Create a draft before copying it.' : '请先生成笔记草稿。');
      return;
    }

    try {
      await copyText(draft);
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 2200);
      void trackReviewEvent(metricId, 'copied');
      const xiaohongshuSearch = `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(`${merchant.name} ${merchant.neighborhood}`)}`;
      const configuredXiaohongshuUrl = merchant.platforms.xiaohongshu.destinationUrl;
      const target = isGoogle
        ? merchant.platforms.google.destinationUrl
        : configuredXiaohongshuUrl?.startsWith('http')
          ? configuredXiaohongshuUrl
          : xiaohongshuSearch;
      if (target) {
        void trackReviewEvent(metricId, 'published');
        window.open(target, '_blank', 'noopener,noreferrer');
      }
    } catch {
      setError(isGoogle ? 'Copy did not work. Please select the text and copy it manually.' : '复制失败，请长按文本后手动复制。');
    }
  };

  return (
    <main className="min-h-screen bg-[#f8efdf] px-4 py-5 text-[#45362d] sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-5 flex items-center justify-between sm:mb-8">
          <Link href={publicReviewPath(merchant)} className="inline-flex items-center gap-1.5 rounded-full border border-[#d7bfa7] bg-[#fffaf3] px-3.5 py-2 text-xs font-semibold text-[#795842] transition hover:bg-white">
            <ArrowLeft className="h-3.5 w-3.5" />
            {isGoogle ? 'All options' : '返回平台选择'}
          </Link>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-bold ${isGoogle ? 'bg-[#e8f0fe] text-[#3969b8]' : 'bg-[#ffeaeb] text-[#d9535d]'}`}>
            {isGoogle ? <Globe2 className="h-3.5 w-3.5" /> : <span className="text-[10px]">小红书</span>}
            {isGoogle ? 'Google Maps' : '小红书'}
          </span>
        </div>

        <header className="mb-7 text-center sm:mb-9">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.24em] text-[#a87859]">{merchant.name} · {merchant.neighborhood}</p>
          <h1 className="font-serif text-3xl leading-tight tracking-[-0.045em] text-[#382a22] sm:text-4xl">{labels.heading}</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#756055]">{labels.subheading}</p>
        </header>

        <div className="overflow-hidden rounded-[2rem] border border-[#dec9b1] bg-[#fffaf4] shadow-[0_18px_45px_rgba(103,71,48,0.11)]">
          <section className="border-b border-[#ead8c5] bg-[linear-gradient(135deg,#fffdf8_0%,#f5e5cf_130%)] p-5 sm:p-7">
            <p className="mb-3 flex items-center gap-2 text-sm font-bold text-[#5b4132]">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#9b6b4f] text-white"><WandSparkles className="h-3.5 w-3.5" /></span>
              {labels.experienceLabel}
            </p>
            <textarea
              value={experience}
              onChange={(event) => {
                setExperience(event.target.value);
                setError('');
              }}
              placeholder={labels.experienceHint}
              rows={4}
              className="w-full resize-none rounded-2xl border border-[#e4d0b9] bg-white/90 px-4 py-3.5 text-sm leading-6 text-[#4d3b31] outline-none transition placeholder:text-[#aa988a] focus:border-[#a67354] focus:ring-4 focus:ring-[#d9ae8a]/20"
            />
            <p className="mt-2 text-[11px] leading-5 text-[#8c7768]">{isGoogle ? 'A few honest details are more helpful than a perfect review.' : '真实的几个小细节，比“完美好评”更有说服力。'}</p>
          </section>

          <section className="p-5 sm:p-7">
            <div className="mb-3 flex items-end justify-between gap-4">
              <h2 className="font-serif text-xl text-[#443229]">{labels.serviceLabel}</h2>
              <span className="text-[11px] text-[#947c6b]">{isGoogle ? 'Choose up to two' : '最多选两个'}</span>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-3">
              {merchant.services.map((service) => (
                <ServiceButton
                  key={service.id}
                  service={service}
                  selected={selectedServiceIds.includes(service.id)}
                  disabled={!selectedServiceIds.includes(service.id) && selectedServiceIds.length >= maxSelectedServices}
                  isGoogle={isGoogle}
                  onClick={() => toggleService(service.id)}
                />
              ))}
            </div>

            <div className="mt-7">
              <h2 className="mb-3 font-serif text-xl text-[#443229]">{labels.tagLabel}</h2>
              <div className="flex flex-wrap gap-2">
                {merchant.experienceTags.map((tag) => {
                  const selected = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleTag(tag.id)}
                      className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition ${selected ? 'border-[#9d6d50] bg-[#9d6d50] text-white shadow-sm' : 'border-[#e5d3c0] bg-white text-[#785f4e] hover:border-[#bf9778] hover:bg-[#fff7ec]'}`}
                    >
                      {selected && <Check className="h-3.5 w-3.5" />}
                      {isGoogle ? tag.googleLabel : tag.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {error && <p role="alert" className="mt-5 rounded-xl border border-[#eac2bb] bg-[#fff1ee] px-3.5 py-3 text-xs leading-5 text-[#a04339]">{error}</p>}

            <button
              type="button"
              disabled={isGenerating}
              onClick={() => void generateDraft()}
              className={`mt-7 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-bold text-white shadow-sm transition active:scale-[0.99] disabled:cursor-wait disabled:opacity-70 ${isGoogle ? 'bg-[#477fd9] hover:bg-[#396ec3]' : 'bg-[#e6535d] hover:bg-[#d9444f]'}`}
            >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {isGenerating ? (isGoogle ? 'Writing your draft…' : '正在整理你的笔记…') : labels.generate}
            </button>
          </section>

          <section className="border-t border-[#ead8c5] bg-[#fffdf9] p-5 sm:p-7">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-serif text-xl text-[#443229]">{labels.draftLabel}</h2>
                <p className="mt-1 text-[11px] text-[#90796a]">{labels.draftHint}</p>
              </div>
              <button
                type="button"
                disabled={isGenerating || (!draft && !experience && selectedServices.length === 0 && selectedTags.length === 0)}
                onClick={() => void generateDraft(variation + 1)}
                className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl border border-[#dfc8b0] bg-white px-3 py-2 text-[11px] font-bold text-[#795842] transition hover:bg-[#fff6eb] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                {labels.refresh}
              </button>
            </div>
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={isGoogle ? 'Your review will appear here.' : '生成后，你的笔记会显示在这里。'}
              rows={isGoogle ? 8 : 10}
              className="w-full resize-y rounded-2xl border border-[#e4d0b9] bg-white px-4 py-3.5 text-sm leading-6 text-[#4d3b31] outline-none transition placeholder:text-[#b09d8e] focus:border-[#a67354] focus:ring-4 focus:ring-[#d9ae8a]/20"
            />
            <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-5 text-[#8d7667]"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#9d775d]" />{merchant.platforms[platform].publishHint || merchant.reviewDisclosure || labels.guardrail}</p>
            <button
              type="button"
              disabled={!draft.trim() || isGenerating}
              onClick={() => void copyAndOpen()}
              className={`mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-bold text-white shadow-sm transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 ${isGoogle ? 'bg-[#306fcf] hover:bg-[#285eae]' : 'bg-[#2e2926] hover:bg-[#181513]'}`}
            >
              {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {isCopied ? (isGoogle ? 'Copied — opening Google Maps' : '已复制，正在打开小红书') : labels.copyAndOpen}
              <ExternalLink className="h-3.5 w-3.5 opacity-75" />
            </button>
          </section>
        </div>

        {merchant.showAddress !== false && (
          <footer className="mt-6 flex items-center justify-center gap-1.5 text-center text-[11px] text-[#947e6e]">
            <MapPin className="h-3.5 w-3.5" /> {merchant.address}
            <MessageCircleHeart className="ml-1 h-3.5 w-3.5" />
          </footer>
        )}
      </div>
    </main>
  );
}

export function ReviewPlatformUnavailable({ merchant, platform }: ReviewAgentProps) {
  const isGoogle = platform === 'google';
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8efdf] px-4 py-8 text-[#45362d]">
      <section className="w-full max-w-md rounded-[2rem] border border-[#dec9b1] bg-[#fffaf4] p-7 text-center shadow-[0_18px_45px_rgba(103,71,48,0.11)] sm:p-9">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f2e2cf] text-[#976d52]"><ShieldCheck className="h-6 w-6" /></span>
        <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.22em] text-[#a87859]">{merchant.name}</p>
        <h1 className="mt-2 font-serif text-3xl text-[#382a22]">{isGoogle ? 'Google reviews are unavailable' : '小红书入口暂未开放'}</h1>
        <p className="mt-4 text-sm leading-6 text-[#775f51]">{isGoogle ? 'This location has not enabled a Google review link yet.' : '这个门店暂未配置小红书发布入口。'}</p>
        <Link href={publicReviewPath(merchant)} className="mt-7 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#94674d] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#80563f]">
          {isGoogle ? 'Return to options' : '返回平台选择'}
        </Link>
      </section>
    </main>
  );
}

type ServiceButtonProps = {
  service: PublicReviewService;
  selected: boolean;
  disabled: boolean;
  isGoogle: boolean;
  onClick: () => void;
};

function ServiceButton({ service, selected, disabled, isGoogle, onClick }: ServiceButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={`relative min-h-28 overflow-hidden rounded-2xl border p-3 text-left transition ${selected ? 'border-[#a87557] bg-[#fff7ec] shadow-sm ring-2 ring-[#c99b78]/25' : 'border-[#ead8c5] bg-white hover:border-[#c69f80]'} ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
    >
      <span aria-hidden className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${service.accent}`} />
      {selected && <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#9d6d50] text-white"><Check className="h-3 w-3" /></span>}
      <span className="mt-2 block text-sm font-bold text-[#543f33]">{isGoogle ? service.englishName : service.name}</span>
      <span className="mt-1.5 block text-[11px] leading-4 text-[#90796a]">{isGoogle ? service.description : service.chineseDescription}</span>
    </button>
  );
}

type LocalDraftArgs = {
  platform: PublicReviewPlatform;
  merchant: PublicReviewMerchant;
  services: PublicReviewService[];
  tags: string[];
  experience: string;
};

function buildLocalDraft({ platform, merchant, services, tags, experience }: LocalDraftArgs): string {
  const serviceText = services.length > 0
    ? services.map((service) => platform === 'google' ? service.englishName.toLowerCase() : service.name).join(platform === 'google' ? ' and ' : '、')
    : '';
  const tagText = tags.length > 0 ? tags.join(platform === 'google' ? ', ' : '、') : '';
  const note = experience.trim().replace(/\s+/g, ' ');

  if (platform === 'google') {
    const opener = serviceText ? `I visited ${merchant.name} for ${serviceText}.` : `I visited ${merchant.name}.`;
    const detail = note && !/[\u4e00-\u9fff]/.test(note)
      ? `One detail from my visit: ${note}${note.endsWith('.') ? '' : '.'}`
      : tagText
        ? `The experience I chose to highlight is “${tagText}”.`
        : 'Please add one specific detail from your own visit before posting this review.';
    const languageNote = note && /[\u4e00-\u9fff]/.test(note)
      ? '\n\nPlease add an English detail from your own visit before posting.'
      : '';
    return `${opener}\n\n${detail}${languageNote}\n\nPlease edit this draft so every line reflects your own experience before posting.`;
  }

  const title = `✨记录一次${serviceText || '到店'}体验`;
  const opening = serviceText ? `这次在 ${merchant.name} 体验了${serviceText}。` : `这次在 ${merchant.name} 留下一条自己的体验记录。`;
  const detail = note
    ? `我自己的感受是：${note}${/[。！？]$/.test(note) ? '' : '。'}`
    : tagText
      ? `想重点记录的关键词是：“${tagText}”。`
      : '发布前我会再补上一两句自己的真实感受。';
  return `${title}\n\n${opening}\n\n${detail}\n\n发布前请按实际体验补充和修改。\n\n#${merchant.neighborhood.replace(/[^a-zA-Z]/g, '') || '本地'}探店 #美容护理`;
}

async function copyText(value: string) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const fallback = document.createElement('textarea');
  fallback.value = value;
  fallback.setAttribute('readonly', '');
  fallback.style.position = 'fixed';
  fallback.style.opacity = '0';
  document.body.appendChild(fallback);
  fallback.select();
  const success = document.execCommand('copy');
  document.body.removeChild(fallback);
  if (!success) throw new Error('Copy command failed.');
}

async function trackReviewEvent(metricId: string | null, event: 'copied' | 'published') {
  if (!metricId) return;

  try {
    await fetch('/api/review-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metricId, event }),
      keepalive: true,
    });
  } catch {
    // Analytics must never block a customer from copying or publishing their own review.
  }
}
