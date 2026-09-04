'use client';

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Camera,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Globe2,
  Loader2,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Star,
  WandSparkles,
} from 'lucide-react';
import {
  publicReviewPath,
  type PublicReviewMerchant,
  type PublicReviewPlatform,
  type PublicReviewService,
  type PublicReviewVoice,
} from './public-review-model';

type ReviewAgentProps = {
  merchant: PublicReviewMerchant;
  platform: PublicReviewPlatform;
  initialServiceId?: string;
};

type FlowStep = 'customize' | 'draft' | 'handoff';

type ApiDraft = {
  content?: string;
};

type ReviewLabels = {
  heading: string;
  subheading: string;
  experienceLabel: string;
  experienceHint: string;
  serviceLabel: string;
  tagLabel: string;
  voiceLabel: string;
  generate: string;
  refresh: string;
  draftLabel: string;
  draftHint: string;
  copyAndOpen: string;
  guardrail: string;
};

type VoiceOption = {
  value: PublicReviewVoice;
  label: string;
  detail: string;
};

const maxSelectedServices = 2;

const ENGLISH_VOICES: VoiceOption[] = [
  { value: 'natural', label: 'Natural', detail: 'Everyday phrasing' },
  { value: 'concise', label: 'Concise', detail: 'Short and direct' },
  { value: 'warm', label: 'Warm story', detail: 'A softer personal flow' },
];

const CHINESE_VOICES: VoiceOption[] = [
  { value: 'natural', label: '自然口吻', detail: '像日常分享' },
  { value: 'concise', label: '简洁一点', detail: '短句直说' },
  { value: 'warm', label: '温暖叙事', detail: '更有个人感受' },
];

const PLATFORM_STYLES: Record<PublicReviewPlatform, {
  badge: string;
  primaryButton: string;
  copyButton: string;
}> = {
  google: {
    badge: 'bg-[#e8f0fe] text-[#3969b8]',
    primaryButton: 'bg-[#477fd9] hover:bg-[#396ec3]',
    copyButton: 'bg-[#306fcf] hover:bg-[#285eae]',
  },
  xiaohongshu: {
    badge: 'bg-[#ffeaeb] text-[#d9535d]',
    primaryButton: 'bg-[#e6535d] hover:bg-[#d9444f]',
    copyButton: 'bg-[#2e2926] hover:bg-[#181513]',
  },
  yelp: {
    badge: 'bg-[#fff0ef] text-[#c74a40]',
    primaryButton: 'bg-[#cc5147] hover:bg-[#b64038]',
    copyButton: 'bg-[#ad3e35] hover:bg-[#933129]',
  },
  instagram: {
    badge: 'bg-[#fff0fa] text-[#b84899]',
    primaryButton: 'bg-[#bd559f] hover:bg-[#a5448c]',
    copyButton: 'bg-[#8c3f7c] hover:bg-[#713061]',
  },
};

export function ReviewAgent({ merchant, platform, initialServiceId }: ReviewAgentProps) {
  const isChinese = platform === 'xiaohongshu';
  const labels = getReviewLabels(platform);
  const style = PLATFORM_STYLES[platform];
  const voiceOptions = isChinese ? CHINESE_VOICES : ENGLISH_VOICES;
  const [step, setStep] = useState<FlowStep>('customize');
  const [showCustomNote, setShowCustomNote] = useState(false);
  const [experience, setExperience] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(
    initialServiceId && merchant.services.some((service) => service.id === initialServiceId) ? [initialServiceId] : [],
  );
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [voice, setVoice] = useState<PublicReviewVoice>('natural');
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
        isChinese
          ? '请先选择体验项目或感受标签。'
          : 'Please select a service or feeling first.',
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
      serviceNames: selectedServices.map((service) => (isChinese ? service.name : service.englishName)),
      serviceSlugs: selectedServices.map((service) => service.id),
      tags: selectedTags.map((tag) => (isChinese ? tag.label : tag.googleLabel)),
      experience: experience.trim(),
      voice,
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
      setStep('draft');
    } catch (err) {
      console.warn('Review draft fetch fallback:', err);
      // A customer can still edit a grounded draft in a local/demo deployment.
      setDraft(
        buildLocalDraft({
          platform,
          merchant,
          services: selectedServices,
          tags: selectedTags.map((tag) => (isChinese ? tag.label : tag.googleLabel)),
          experience,
          voice,
        }),
      );
      setMetricId(null);
      setStep('draft');
    } finally {
      setIsGenerating(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      window.setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  const copyAndOpen = async () => {
    if (!draft.trim()) {
      setError(isChinese ? '请先生成笔记草稿。' : 'Create a draft before copying it.');
      return;
    }

    try {
      await copyText(draft);
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 3000);
      void trackReviewEvent(metricId, 'copied');

      const target = getPlatformDestination(merchant, platform);
      if (!target) {
        setError(getMissingDestinationCopy(platform));
        return;
      }

      if (requiresMobileHandoff(platform, target)) {
        // Mobile browsers are much more likely to allow an app deep-link that
        // follows a deliberate tap. The handoff view also keeps a web fallback
        // visible if the native app cannot be opened.
        setStep('handoff');
        return;
      }

      void trackReviewEvent(metricId, 'published');
      window.open(target, '_blank', 'noopener,noreferrer');
    } catch {
      setError(isChinese ? '复制失败，请长按文本后手动复制。' : 'Copy did not work. Please select the text and copy it manually.');
    }
  };

  return (
    <main className="min-h-screen bg-[#f8efdf] px-3.5 py-4 text-[#45362d] sm:px-6 sm:py-8 flex flex-col justify-center">
      <div className="mx-auto w-full max-w-xl">
        {step === 'customize' ? (
          /* STEP 1: COMPACT 1-SCREEN SELECTION (手机端一屏) */
          <div className="flex flex-col justify-between">
            {/* Top Navigation */}
            <div className="mb-2.5 flex items-center justify-between">
              <Link
                href={publicReviewPath(merchant)}
                className="inline-flex items-center gap-1 rounded-full border border-[#d7bfa7] bg-[#fffaf3] px-3 py-1.5 text-xs font-semibold text-[#795842] transition hover:bg-white active:scale-95 shadow-xs"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {isChinese ? '返回平台选择' : 'All options'}
              </Link>
              <PlatformBadge platform={platform} className={style.badge} />
            </div>

            {/* Header Banner */}
            <header className="mb-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a87859]">
                02 · {merchant.name} · {merchant.neighborhood}
              </p>
              <h1 className="font-serif text-2xl sm:text-3xl leading-tight tracking-[-0.03em] text-[#382a22]">
                {labels.heading}
              </h1>
              <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-[#756055]">
                {labels.subheading}
              </p>
            </header>

            {/* Main Selection Card */}
            <div className="overflow-hidden rounded-3xl border border-[#dec9b1] bg-[#fffaf4] p-4 sm:p-5 shadow-[0_12px_32px_rgba(103,71,48,0.08)] space-y-3.5">
              {/* 1. Services */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#543f33]">
                    {labels.serviceLabel}
                  </h2>
                  <span className="text-[10px] text-[#947c6b]">
                    {isChinese ? '最多选两项' : 'Choose up to 2'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {merchant.services.map((service) => (
                    <ServiceButton
                      key={service.id}
                      service={service}
                      selected={selectedServiceIds.includes(service.id)}
                      disabled={!selectedServiceIds.includes(service.id) && selectedServiceIds.length >= maxSelectedServices}
                      isChinese={isChinese}
                      onClick={() => toggleService(service.id)}
                    />
                  ))}
                </div>
              </div>

              {/* 2. Feelings & Tags */}
              <div>
                <h2 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-[#543f33]">
                  {labels.tagLabel}
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {merchant.experienceTags.map((tag) => {
                    const selected = selectedTagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => toggleTag(tag.id)}
                        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition active:scale-95 ${
                          selected
                            ? 'border-[#9d6d50] bg-[#9d6d50] text-white shadow-xs'
                            : 'border-[#e5d3c0] bg-white text-[#785f4e] hover:border-[#bf9778] hover:bg-[#fff7ec]'
                        }`}
                      >
                        {selected && <Check className="h-3 w-3" />}
                        {isChinese ? tag.label : tag.googleLabel}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Tone / Voice */}
              <div>
                <h2 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-[#543f33]">
                  {labels.voiceLabel}
                </h2>
                <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-[#f0e4d4]/60 p-1 border border-[#e8d7c4]">
                  {voiceOptions.map((option) => {
                    const selected = voice === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setVoice(option.value)}
                        className={`rounded-lg py-1.5 text-center text-xs font-bold transition ${
                          selected
                            ? 'bg-white text-[#5a4234] shadow-xs'
                            : 'text-[#876e5d] hover:text-[#5a4234]'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Collapsible Personal Note (下移且默认折叠) */}
              <div className="pt-2 border-t border-[#f0e1d0]">
                <button
                  type="button"
                  onClick={() => setShowCustomNote(!showCustomNote)}
                  className="flex items-center justify-between w-full py-1 text-xs font-semibold text-[#8c6b54] hover:text-[#5b4132] transition"
                >
                  <span className="flex items-center gap-1.5">
                    <WandSparkles className="h-3.5 w-3.5 text-[#a87557]" />
                    {showCustomNote
                      ? (isChinese ? '收起补充细节' : 'Hide custom note')
                      : (isChinese ? '+ 补充自定义细节（选填）' : '+ Add custom detail (optional)')}
                  </span>
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${showCustomNote ? 'rotate-180' : ''}`} />
                </button>

                {showCustomNote && (
                  <div className="mt-2">
                    <textarea
                      value={experience}
                      onChange={(event) => {
                        setExperience(event.target.value);
                        setError('');
                      }}
                      placeholder={labels.experienceHint}
                      rows={3}
                      className="w-full resize-none rounded-xl border border-[#e4d0b9] bg-white px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed text-[#4d3b31] outline-none transition placeholder:text-[#aa988a] focus:border-[#a67354] focus:ring-2 focus:ring-[#d9ae8a]/20"
                    />
                  </div>
                )}
              </div>

              {error && (
                <p role="alert" className="rounded-xl border border-[#eac2bb] bg-[#fff1ee] px-3 py-2 text-xs leading-5 text-[#a04339]">
                  {error}
                </p>
              )}

              {/* 5. Bottom Generate Button */}
              <button
                type="button"
                disabled={isGenerating}
                onClick={() => void generateDraft()}
                className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-bold text-white shadow-md transition active:scale-[0.99] disabled:cursor-wait disabled:opacity-75 ${style.primaryButton}`}
              >
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {isGenerating
                  ? (isChinese ? '正在撰写笔记中…' : 'Writing your draft…')
                  : (isChinese ? '✨ 生成好评草稿' : labels.generate)}
              </button>
            </div>

            {merchant.showAddress !== false && (
              <footer className="mt-3 flex items-center justify-center gap-1.5 text-center text-[10px] text-[#947e6e]">
                <MapPin className="h-3 w-3" /> {merchant.address}
              </footer>
            )}
          </div>
        ) : step === 'handoff' ? (
          <PublishHandoff
            merchant={merchant}
            platform={platform}
            metricId={metricId}
            onBack={() => setStep('draft')}
          />
        ) : (
          /* STEP 2: REVIEW DRAFT RESULT CARD (第二张图片独立页) */
          <div className="flex flex-col justify-between">
            {/* Step 2 Top Bar: Back & Regenerate */}
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep('customize')}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#d7bfa7] bg-[#fffaf3] px-3.5 py-1.5 text-xs font-semibold text-[#795842] transition hover:bg-white active:scale-95 shadow-xs"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {isChinese ? '返回修改' : 'Back / Edit'}
              </button>

              <button
                type="button"
                disabled={isGenerating}
                onClick={() => void generateDraft(variation + 1)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#dfc8b0] bg-white px-3.5 py-1.5 text-xs font-bold text-[#795842] transition hover:bg-[#fff6eb] active:scale-95 disabled:opacity-50 shadow-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                {labels.refresh}
              </button>
            </div>

            {/* Step 2 Draft Container */}
            <div className="overflow-hidden rounded-3xl border border-[#dec9b1] bg-[#fffaf4] p-5 sm:p-7 shadow-[0_16px_40px_rgba(103,71,48,0.1)] space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="font-serif text-2xl text-[#382a22] tracking-tight">
                    {labels.draftLabel}
                  </h2>
                  <PlatformBadge platform={platform} className={style.badge} />
                </div>
                <p className="mt-1 text-xs text-[#8c7768]">
                  {labels.draftHint}
                </p>
              </div>

              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={getDraftPlaceholder(platform)}
                  rows={isChinese || platform === 'instagram' ? 10 : 7}
                  className="w-full resize-none rounded-2xl border border-[#e4d0b9] bg-white p-4 text-[14.5px] leading-relaxed text-[#4d3b31] outline-none transition placeholder:text-[#b09d8e] focus:border-[#a67354] focus:ring-4 focus:ring-[#d9ae8a]/20 shadow-inner"
                />
              </div>

              <p className="flex items-start gap-1.5 text-[11px] leading-5 text-[#8d7667]">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#9d775d]" />
                {merchant.platforms[platform].publishHint || merchant.reviewDisclosure || labels.guardrail}
              </p>

              {isCopied && (
                <div className="flex items-center justify-center gap-2 rounded-xl bg-[#ecfdf5] border border-[#a7f3d0] py-2 px-3 text-xs font-semibold text-[#065f46]">
                  <Check className="h-4 w-4 text-[#059669]" />
                  {getCopiedLabel(platform)}
                </div>
              )}

              {error && (
                <p role="alert" className="rounded-xl border border-[#eac2bb] bg-[#fff1ee] px-3 py-2 text-xs leading-5 text-[#a04339]">
                  {error}
                </p>
              )}

              {/* Big Action Button */}
              <button
                type="button"
                disabled={!draft.trim() || isGenerating}
                onClick={() => void copyAndOpen()}
                className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-bold text-white shadow-lg transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 ${style.copyButton}`}
              >
                {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {isCopied ? getCopiedLabel(platform) : labels.copyAndOpen}
                <ExternalLink className="h-3.5 w-3.5 opacity-80" />
              </button>
            </div>

            {merchant.showAddress !== false && (
              <footer className="mt-3 flex items-center justify-center gap-1.5 text-center text-[10px] text-[#947e6e]">
                <MapPin className="h-3 w-3" /> {merchant.address}
              </footer>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

export function ReviewPlatformUnavailable({ merchant, platform }: ReviewAgentProps) {
  const copy = getUnavailableCopy(platform);
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8efdf] px-4 py-8 text-[#45362d]">
      <section className="w-full max-w-md rounded-[2rem] border border-[#dec9b1] bg-[#fffaf4] p-7 text-center shadow-[0_18px_45px_rgba(103,71,48,0.11)] sm:p-9">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f2e2cf] text-[#976d52]"><ShieldCheck className="h-6 w-6" /></span>
        <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.22em] text-[#a87859]">{merchant.name}</p>
        <h1 className="mt-2 font-serif text-3xl text-[#382a22]">{copy.heading}</h1>
        <p className="mt-4 text-sm leading-6 text-[#775f51]">{copy.description}</p>
        <Link href={publicReviewPath(merchant)} className="mt-7 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#94674d] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#80563f]">
          {copy.returnLabel}
        </Link>
      </section>
    </main>
  );
}

function PlatformBadge({ platform, className }: { platform: PublicReviewPlatform; className: string }) {
  const icon = platform === 'google'
    ? <Globe2 className="h-3.5 w-3.5" />
    : platform === 'instagram'
      ? <Camera className="h-3.5 w-3.5" />
      : platform === 'yelp'
        ? <Star className="h-3.5 w-3.5 fill-current" />
        : <span className="text-[10px]">小红书</span>;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-bold ${className}`}>
      {icon}
      {getPlatformName(platform)}
    </span>
  );
}

type ServiceButtonProps = {
  service: PublicReviewService;
  selected: boolean;
  disabled: boolean;
  isChinese: boolean;
  onClick: () => void;
};

function ServiceButton({ service, selected, disabled, isChinese, onClick }: ServiceButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={`relative overflow-hidden rounded-xl border p-2 text-left transition flex flex-col justify-between min-h-[64px] active:scale-95 ${
        selected
          ? 'border-[#a87557] bg-[#fff7ec] shadow-xs ring-2 ring-[#c99b78]/25'
          : 'border-[#ead8c5] bg-white hover:border-[#c69f80]'
      } ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
    >
      <span aria-hidden className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${service.accent}`} />
      <div className="flex items-start justify-between gap-1 mt-1">
        <span className="block text-xs font-bold text-[#543f33] leading-tight line-clamp-1">
          {isChinese ? service.name : service.englishName}
        </span>
        {selected && (
          <span className="shrink-0 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#9d6d50] text-white">
            <Check className="h-2.5 w-2.5" />
          </span>
        )}
      </div>
      <span className="mt-1 block text-[10px] leading-tight text-[#90796a] line-clamp-1">
        {isChinese ? service.chineseDescription : service.description}
      </span>
    </button>
  );
}

type LocalDraftArgs = {
  platform: PublicReviewPlatform;
  merchant: PublicReviewMerchant;
  services: PublicReviewService[];
  tags: string[];
  experience: string;
  voice: PublicReviewVoice;
};

function buildLocalDraft({ platform, merchant, services, tags, experience, voice }: LocalDraftArgs): string {
  const isChinese = platform === 'xiaohongshu';
  const serviceText = services.length > 0
    ? services.map((service) => (isChinese ? service.name : service.englishName)).join(isChinese ? '、' : ' and ')
    : '';
  const tagText = tags.length > 0 ? tags.join(isChinese ? '、' : ', ') : '';
  const note = experience.trim().replace(/\s+/g, ' ');

  if (platform === 'xiaohongshu') {
    return buildXiaohongshuDraft({ merchant, serviceText, tagText, note });
  }

  if (platform === 'instagram') {
    return buildInstagramDraft({ merchant, serviceText, tagText, note });
  }

  return buildEnglishReviewDraft({ merchant, serviceText, tagText, note, voice });
}

function buildEnglishReviewDraft({
  merchant,
  serviceText,
  tagText,
  note,
  voice,
}: {
  merchant: PublicReviewMerchant;
  serviceText: string;
  tagText: string;
  note: string;
  voice: PublicReviewVoice;
}) {
  const service = serviceText || 'spa session';
  const highlights = tagText || 'relaxing atmosphere and attentive service';
  const noteClean = note && !/[\u4e00-\u9fff]/.test(note) ? withEnglishPunctuation(note) : '';

  if (voice === 'concise') {
    return `Had a wonderful ${service} at ${merchant.name} in ${merchant.neighborhood}. The ${highlights.toLowerCase()} really stood out to me. ${noteClean ? noteClean + ' ' : ''}Clean space and great experience overall!`;
  }
  if (voice === 'warm') {
    return `Such a lovely, restorative visit to ${merchant.name}! I booked the ${service}, and from start to finish, the ${highlights.toLowerCase()} made me feel completely cared for. ${noteClean ? noteClean + ' ' : ''}Truly appreciate their welcoming space and skilled care.`;
  }
  return `Really enjoyed my visit to ${merchant.name} for the ${service}. The ${highlights.toLowerCase()} was fantastic and made the entire experience super relaxing. ${noteClean ? noteClean + ' ' : ''}Definitely recommend booking an appointment here!`;
}

function buildInstagramDraft({
  merchant,
  serviceText,
  tagText,
  note,
}: {
  merchant: PublicReviewMerchant;
  serviceText: string;
  tagText: string;
  note: string;
}) {
  const service = serviceText || 'self-care session';
  const tagList = tagText ? tagText.toLowerCase() : 'peaceful and refreshing';
  const noteClean = note && !/[\u4e00-\u9fff]/.test(note) ? withEnglishPunctuation(note) : '';

  const hashtags = [
    hashtagFromText(merchant.name),
    ...serviceText.split(' and ').map(hashtagFromText),
    '#SelfCare',
    '#SpaDay',
  ].filter(Boolean).slice(0, 5).join(' ');

  return `Self-care afternoon at ${merchant.name} ✨\n\nTried their ${service} today. Loving the ${tagList} vibes. ${noteClean ? noteClean + ' ' : ''}Left feeling completely refreshed and grounded.\n\n${hashtags}`;
}

function buildXiaohongshuDraft({
  merchant,
  serviceText,
  tagText,
  note,
}: {
  merchant: PublicReviewMerchant;
  serviceText: string;
  tagText: string;
  note: string;
}) {
  const service = serviceText || '面部与护理SPA';
  const tagsStr = tagText || '环境舒服、服务贴心';
  const noteClean = note ? withChinesePunctuation(note) : '';

  const titles = [
    `✨在${merchant.neighborhood}挖到超舒服的${service}宝藏店！`,
    `💆周末放松指南｜${merchant.name}真实体验打卡`,
    `🌿把疲惫一扫而空！私藏的${service}治愈小天地`,
  ];
  const title = titles[0];

  const detail = noteClean
    ? `我自己的感受是：${noteClean}`
    : `全程体验下来最大的感受就是【${tagsStr}】。`;

  const body = `这次在${merchant.name}做了${service}，体验感真的拉满！\n\n${detail}空间干净私密，轻音乐伴随精油香气让人很快就沉静下来。技师细致周到，完全没有催促感，做完身心都得到了彻底的舒缓与放松～`;

  const hashTags = [
    hashtagFromText(merchant.neighborhood.replace(/[^a-zA-Z]/g, '') || 'Baltimore') + '探店',
    '#美容护理',
    hashtagFromText(service),
    '#沉浸式SPA',
    '#周末放松',
  ].filter(Boolean).join(' ');

  return `${title}\n\n${body}\n\n${hashTags}`;
}

function withEnglishPunctuation(value: string) {
  return /[.!?]$/.test(value) ? value : `${value}.`;
}

function withChinesePunctuation(value: string) {
  return /[。！？]$/.test(value) ? value : `${value}。`;
}

function hashtagFromText(value: string) {
  const compact = value.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '');
  return compact ? `#${compact}` : '';
}

function getReviewLabels(platform: PublicReviewPlatform): ReviewLabels {
  if (platform === 'xiaohongshu') {
    return {
      heading: '把这次体验好好说出来吧。',
      subheading: '我们只根据你的真实感受，整理成一篇自然、有温度的小红书笔记。',
      experienceLabel: '这次最想分享什么？',
      experienceHint: '例如：哪一个细节让你觉得舒服、放松或被照顾到？',
      serviceLabel: '这次体验了什么项目？',
      tagLabel: '可多选，挑选贴近你的感受',
      voiceLabel: '想用什么口吻？',
      generate: '生成我的笔记草稿',
      refresh: '换一个写法',
      draftLabel: '你的笔记草稿',
      draftHint: '可以直接修改，让它更像你本人。',
      copyAndOpen: '复制并去小红书发布',
      guardrail: '发布前请仔细核对和修改。页面不会自动替你发布。',
    };
  }

  if (platform === 'instagram') {
    return {
      heading: 'Turn your real moment into a caption.',
      subheading: 'We use only the details you choose to share — you decide what belongs in your post.',
      experienceLabel: 'What would you like to mention?',
      experienceHint: 'For example: a small moment, feeling, or detail you want to remember.',
      serviceLabel: 'Which service did you try?',
      tagLabel: 'Choose any feelings that fit',
      voiceLabel: 'Choose a voice',
      generate: 'Create my caption draft',
      refresh: 'Try another version',
      draftLabel: 'Your caption draft',
      draftHint: 'Edit anything until it sounds like you.',
      copyAndOpen: 'Copy & Open Instagram',
      guardrail: 'Please read and edit your caption before sharing. Nothing is posted automatically.',
    };
  }

  if (platform === 'yelp') {
    return {
      heading: 'Share the details that mattered to you.',
      subheading: 'We make a clear English draft from only what you choose to share.',
      experienceLabel: 'What would you like to mention?',
      experienceHint: 'For example: what felt thoughtful, calm, or worth remembering?',
      serviceLabel: 'Which service did you try?',
      tagLabel: 'Choose any feelings that fit',
      voiceLabel: 'Choose a voice',
      generate: 'Create my Yelp review',
      refresh: 'Try another version',
      draftLabel: 'Your review draft',
      draftHint: 'Edit anything until it sounds like you.',
      copyAndOpen: 'Copy & Write Review on Yelp',
      guardrail: 'Please read and edit your review before sharing. Nothing is posted automatically.',
    };
  }

  return {
    heading: 'Tell your story, in your own words.',
    subheading: 'We make a natural English draft from only what you choose to share.',
    experienceLabel: 'What would you like to mention?',
    experienceHint: 'For example: what felt especially thoughtful, calm, or memorable?',
    serviceLabel: 'Which service did you try?',
    tagLabel: 'Choose any feelings that fit',
    voiceLabel: 'Choose a voice',
    generate: 'Create my review draft',
    refresh: 'Try another version',
    draftLabel: 'Your review draft',
    draftHint: 'Edit anything until it sounds like you.',
    copyAndOpen: 'Copy & Write Review on Google Maps',
    guardrail: 'Please read and edit your review before sharing. Nothing is posted automatically.',
  };
}

function getPlatformName(platform: PublicReviewPlatform) {
  if (platform === 'google') return 'Google Maps';
  if (platform === 'xiaohongshu') return '小红书';
  if (platform === 'yelp') return 'Yelp';
  return 'Instagram';
}

function getDraftPlaceholder(platform: PublicReviewPlatform) {
  if (platform === 'xiaohongshu') return '生成后，你的笔记会显示在这里。';
  if (platform === 'instagram') return 'Your caption will appear here.';
  return 'Your review will appear here.';
}

function getCopiedLabel(platform: PublicReviewPlatform) {
  if (platform === 'xiaohongshu') return '文案已复制，可前往小红书发布。';
  if (platform === 'google') return 'Copied! Opening Google review form…';
  if (platform === 'yelp') return 'Copied! Opening Yelp review form…';
  return `Copied! Opening ${getPlatformName(platform)}…`;
}

function getUnavailableCopy(platform: PublicReviewPlatform) {
  if (platform === 'xiaohongshu') {
    return {
      heading: '小红书入口暂未开放',
      description: '这个门店暂未配置小红书发布入口。',
      returnLabel: '返回平台选择',
    };
  }
  if (platform === 'yelp') {
    return {
      heading: 'Yelp reviews are unavailable',
      description: 'This location has not enabled a Yelp review link yet.',
      returnLabel: 'Return to options',
    };
  }
  if (platform === 'instagram') {
    return {
      heading: 'Instagram captions are unavailable',
      description: 'This location has not enabled an Instagram destination yet.',
      returnLabel: 'Return to options',
    };
  }
  return {
    heading: 'Google reviews are unavailable',
    description: 'This location has not enabled a Google review link yet.',
    returnLabel: 'Return to options',
  };
}

function getPlatformDestination(merchant: PublicReviewMerchant, platform: PublicReviewPlatform) {
  const configured = merchant.platforms[platform];
  return configured?.destinationUrl || configured?.fallbackUrl;
}

function requiresMobileHandoff(platform: PublicReviewPlatform, destination: string) {
  return (platform === 'xiaohongshu' || platform === 'instagram') && !destination.startsWith('http');
}

function getMissingDestinationCopy(platform: PublicReviewPlatform) {
  if (platform === 'xiaohongshu') return '小红书发布入口暂未配置，请稍后再试。';
  if (platform === 'yelp') return 'Yelp 评价链接暂未配置，请稍后再试。';
  if (platform === 'instagram') return 'Instagram 发布入口暂未配置，请稍后再试。';
  return 'Google 评价链接暂未配置，请稍后再试。';
}

function getWebFallback(merchant: PublicReviewMerchant, platform: PublicReviewPlatform) {
  const configuredFallback = merchant.platforms[platform]?.fallbackUrl;
  if (configuredFallback?.startsWith('http')) return configuredFallback;
  if (platform === 'xiaohongshu') {
    return `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(merchant.name)}`;
  }
  return 'https://www.instagram.com/';
}

function PublishHandoff({
  merchant,
  platform,
  metricId,
  onBack,
}: {
  merchant: PublicReviewMerchant;
  platform: PublicReviewPlatform;
  metricId: string | null;
  onBack: () => void;
}) {
  const destination = getPlatformDestination(merchant, platform);
  const webFallback = getWebFallback(merchant, platform);
  const isXiaohongshu = platform === 'xiaohongshu';
  return (
    <div className="flex flex-col justify-between">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 rounded-full border border-[#d7bfa7] bg-[#fffaf3] px-3.5 py-1.5 text-xs font-semibold text-[#795842] transition hover:bg-white active:scale-95 shadow-xs">
          <ArrowLeft className="h-3.5 w-3.5" /> {isXiaohongshu ? '返回文案修改' : 'Back to caption'}
        </button>
        <PlatformBadge platform={platform} className={PLATFORM_STYLES[platform].badge} />
      </div>
      <section className="rounded-3xl border border-[#dec9b1] bg-[#fffaf4] p-6 text-center shadow-[0_16px_40px_rgba(103,71,48,0.1)] sm:p-8">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ecfdf5] text-[#059669]"><Check className="h-6 w-6" /></span>
        <h1 className="mt-5 font-serif text-3xl text-[#382a22]">{isXiaohongshu ? '文案已经复制好了' : 'Your caption is copied'}</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#766154]">
          {isXiaohongshu
            ? '请点击下方按钮打开小红书，再粘贴、补充真实图片后发布。'
            : 'Tap the button below to open Instagram and paste your caption when you are ready.'}
        </p>
        {destination && (
          <a
            href={destination}
            onClick={() => void trackReviewEvent(metricId, 'published')}
            className={`mt-7 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-bold text-white shadow-lg transition active:scale-[0.99] ${PLATFORM_STYLES[platform].copyButton}`}
          >
            {isXiaohongshu ? '打开小红书去发布' : 'Open Instagram'} <ExternalLink className="h-4 w-4" />
          </a>
        )}
        <div className="mt-5 rounded-2xl border border-[#eadbc9] bg-white p-4 text-left">
          <p className="text-xs font-semibold text-[#5b4738]">{isXiaohongshu ? '如果 App 没有打开' : 'If Instagram does not open'}</p>
          <p className="mt-1 text-xs leading-5 text-[#8b7566]">
            {isXiaohongshu ? '文案仍在剪贴板中。你可以手动打开 App 粘贴，或先进入网页搜索页。' : 'Your caption remains copied. Open the app manually, or continue to the web site.'}
          </p>
          <a href={webFallback} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#8b5f44] hover:text-[#5d3e2c]">
            {isXiaohongshu ? '打开小红书网页搜索' : 'Open Instagram on the web'} <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </section>
    </div>
  );
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
