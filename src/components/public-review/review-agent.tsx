'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
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

type PersistedReviewState = {
  serviceIds?: string[];
  tagIds?: string[];
  experience?: string;
  draft?: string;
  voice?: PublicReviewVoice;
  variation?: number;
};

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
  const [experience, setExperience] = useState('');
  const [isExperienceOpen, setIsExperienceOpen] = useState(false);

  const parsedInitialIds = useMemo(() => {
    if (!initialServiceId) return merchant.services.slice(0, 1).map((s) => s.id);
    const ids = initialServiceId.split(',').map((id) => id.trim()).filter(Boolean);
    const validIds = ids.filter((id) => merchant.services.some((s) => s.id === id));
    return validIds.length > 0 ? validIds : merchant.services.slice(0, 1).map((s) => s.id);
  }, [initialServiceId, merchant.services]);

  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(parsedInitialIds);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([
    merchant.experienceTags[0]?.id || 'calm',
  ]);
  const [voice, setVoice] = useState<PublicReviewVoice>('natural');
  const [draft, setDraft] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState('');
  const [variation, setVariation] = useState(0);
  const [metricId, setMetricId] = useState<string | null>(null);
  const [hasRestoredState, setHasRestoredState] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const draftHistoryRef = useRef(new Set<string>());
  const draftEdgesRef = useRef<string[]>([]);
  const storageKey = `pointhub-review:${merchant.merchantSlug}:${merchant.locationSlug}:${platform}`;

  const selectedServices = useMemo(
    () => merchant.services.filter((service) => selectedServiceIds.includes(service.id)),
    [merchant.services, selectedServiceIds],
  );
  const selectedTags = useMemo(
    () => merchant.experienceTags.filter((tag) => selectedTagIds.includes(tag.id)),
    [merchant.experienceTags, selectedTagIds],
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const raw = window.sessionStorage.getItem(storageKey);
        if (!raw) return;
        const saved = JSON.parse(raw) as PersistedReviewState;
        const validServiceIds = (saved.serviceIds || []).filter((id) => merchant.services.some((service) => service.id === id)).slice(0, 2);
        const validTagIds = (saved.tagIds || []).filter((id) => merchant.experienceTags.some((tag) => tag.id === id));
        if (validServiceIds.length > 0) setSelectedServiceIds(validServiceIds);
        if (validTagIds.length > 0) setSelectedTagIds(validTagIds);
        if (typeof saved.experience === 'string') setExperience(saved.experience.slice(0, 500));
        if (typeof saved.draft === 'string') setDraft(saved.draft);
        if (saved.voice && ['natural', 'concise', 'warm'].includes(saved.voice)) setVoice(saved.voice);
        if (typeof saved.variation === 'number') setVariation(saved.variation);
      } catch {
        // A malformed local session must never block the customer flow.
      } finally {
        setHasRestoredState(true);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [merchant.experienceTags, merchant.services, storageKey]);

  useEffect(() => {
    if (!hasRestoredState) return;
    const state: PersistedReviewState = {
      serviceIds: selectedServiceIds,
      tagIds: selectedTagIds,
      experience,
      draft,
      voice,
      variation,
    };
    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // Storage can be unavailable in private browser modes; continue normally.
    }
  }, [draft, experience, hasRestoredState, selectedServiceIds, selectedTagIds, storageKey, variation, voice]);

  const toggleService = (serviceId: string) => {
    setError('');
    setSelectedServiceIds((current) => {
      if (!current.includes(serviceId) && current.length >= 2) {
        setError(isChinese ? '最多选择 2 个服务项目。' : 'You can select up to 2 services.');
        return current;
      }
      const updated = current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId];

      setDraft('');
      return updated;
    });
  };

  const toggleTag = (tagId: string) => {
    setError('');
    setSelectedTagIds((current) => {
      const updated = current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId];
      setDraft('');
      return updated;
    });
  };

  const handleVoiceChange = (newVoice: PublicReviewVoice) => {
    setVoice(newVoice);
    setDraft('');
  };

  const handleExperienceChange = (value: string) => {
    setExperience(value);
    setError('');
    setDraft('');
  };

  const generateDraft = async (nextVariation = variation + 1) => {
    setIsGenerating(true);
    setError('');
    setIsCopied(false);
    setVariation(nextVariation);
    setDraft('');
    setMetricId(null);

    try {
      // A session never shows the exact same generated draft twice. This is a
      // quality guard for a customer's own editable writing, not a substitute
      // for platform policy or an attempt to bypass moderation.
      for (let retry = 0; retry < 3; retry += 1) {
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
          seed: Date.now() + nextVariation + retry,
          avoidPhrases: draftEdgesRef.current,
        };
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

        const candidate = apiDraft || data.review || '';
        const fingerprint = fingerprintDraft(candidate);
        if (draftHistoryRef.current.has(fingerprint)) continue;

        draftHistoryRef.current.add(fingerprint);
        draftEdgesRef.current = [...draftEdgesRef.current, ...draftEdgeFragments(candidate)].slice(-6);
        setDraft(candidate);
        setMetricId(data.metricId || null);
        return;
      }
      throw new Error('The model repeated a previous draft.');
    } catch (err) {
      console.warn('Review draft request failed:', err);
      void clearClipboard();
      const message = err instanceof Error ? err.message : '';
      const rateLimited = message.includes('Please wait a few minutes');
      const formatRejected = message.includes('did not meet the platform format');
      setError(
        rateLimited
          ? (isChinese ? '生成次数较多，请几分钟后再试。' : 'You have created several drafts. Please wait a few minutes and try again.')
          : formatRejected
            ? (isChinese ? '这一版没有通过平台格式检查。请补充一个真实细节后重试。' : 'This version did not meet the platform format. Add one real detail and try again.')
            : (isChinese ? '暂时无法生成草稿。请补充一个真实细节后重试；系统不会用默认模板替代。' : 'A draft could not be created yet. Add one real detail and try again; we will not substitute a default template.'),
      );
      setMetricId(null);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyDraftInBackground = () => {
    void copyText(draft)
      .then(() => {
        setIsCopied(true);
        window.setTimeout(() => setIsCopied(false), 3000);
        void trackReviewEvent(metricId, 'copied');
      })
      .catch(() => {
        // Opening the configured platform must not depend on browser clipboard
        // permission. The customer can still long-press the editable draft.
        setError(isChinese ? '未能自动复制，可长按草稿手动复制；已继续打开平台。' : 'Copy was unavailable. Please select the editable draft and copy it manually; the platform was still opened.');
      });
  };

  const copyAndOpen = () => {
    if (!draft.trim()) {
      setError(isChinese ? '请先生成评价草稿。' : 'Create a draft before copying it.');
      return;
    }

    const target = getPlatformDestination(merchant, platform);
    if (!target) {
      setError(getMissingDestinationCopy(platform));
      return;
    }

    // App schemes must be launched from an immediate tap. Show their dedicated
    // handoff first; copying continues independently and never blocks it.
    if (requiresMobileHandoff(platform, target)) {
      copyDraftInBackground();
      setStep('handoff');
      // iOS Safari and Android Chrome only allow app schemes inside the
      // original user gesture. If no installed app accepts the scheme, keep a
      // short grace period and then continue to the configured web fallback.
      window.location.assign(target);
      window.setTimeout(() => {
        if (document.visibilityState === 'visible') {
          window.location.assign(getWebFallback(merchant, platform));
        }
      }, 1200);
      return;
    }

    // Mobile Safari/Chrome will commonly block a popup after an awaited
    // clipboard call. Launch synchronously, then fall back to same-tab
    // navigation when a popup is blocked.
    const popup = window.open(target, '_blank', 'noopener,noreferrer');
    if (!popup) window.location.assign(target);
    void trackReviewEvent(metricId, 'published');
    copyDraftInBackground();
  };

  if (step === 'handoff') {
    return (
      <main className="min-h-screen bg-[#ece5dc] px-3.5 py-6 sm:py-10 flex flex-col items-center justify-center font-sans text-[#3c342f]">
        <div className="w-full max-w-[440px]">
          <PublishHandoff
            merchant={merchant}
            platform={platform}
            metricId={metricId}
            onBack={() => setStep('customize')}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#ece5dc] px-3 py-5 sm:px-3.5 sm:py-10 flex flex-col items-center justify-center font-sans text-[#3c342f]">
      <div className="flex w-full min-w-0 max-w-[440px] flex-col space-y-3.5">
        {/* TOP BAR: 返回平台选择 */}
        <div className="flex items-center justify-between px-1">
          <Link
            href={publicReviewPath(merchant)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#735846] hover:text-[#422e22] transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{isChinese ? '返回平台选择' : 'All platforms'}</span>
          </Link>
          <PlatformBadge platform={platform} className={style.badge} />
        </div>

        {/* HEADER: AI 文案助手 */}
        <div className="px-1 pt-0.5">
          <h1 className="text-xl font-bold text-[#35271f] tracking-tight">
            {isChinese ? 'AI 文案助手' : 'AI Review Assistant'}
          </h1>
          <p className="mt-0.5 text-xs text-[#8c7465]">
            {isChinese
              ? '只根据顾客填写的真实感受生成'
              : 'Grounded in your real visit and honest thoughts'}
          </p>
        </div>

        {/* MAIN CONTAINER (卡片包裹表单) */}
        <div className="min-w-0 overflow-hidden rounded-3xl border border-[#d9ccbe] bg-[#fbf6ef] p-3.5 sm:p-5 shadow-[0_8px_25px_rgba(80,60,40,0.06)] space-y-4">
          
          {/* ① 服务与标签：分开呈现，避免把服务和感受混为一组 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="flex min-w-0 items-center gap-1.5 text-xs font-bold text-[#4a362b]">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#8c674e] text-[10px] text-white font-bold">
                  1
                </span>
                <span className="min-w-0">{isChinese ? '服务项目（最多 2 项）' : 'Services (max 2)'}</span>
              </label>
              <span className="text-[10.5px] text-[#9c8475]">
                {isChinese
                  ? `${selectedServiceIds.length}/2 项服务 · ${selectedTagIds.length} 标签`
                  : `${selectedServiceIds.length}/2 services · ${selectedTagIds.length} highlights`}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {merchant.services.map((service) => {
                const isSelected = selectedServiceIds.includes(service.id);
                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => toggleService(service.id)}
                    className={`rounded-xl px-2.5 py-1 text-xs font-medium transition active:scale-95 flex items-center gap-1 border ${
                      isSelected
                        ? 'border-[#996d51] bg-[#996d51] text-white shadow-xs'
                        : 'border-[#dfd0bf] bg-white text-[#6b5444] hover:bg-[#faf4ee]'
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3 shrink-0" />}
                    <span>{isChinese ? service.name : service.englishName}</span>
                  </button>
                );
              })}
            </div>

            <div className="border-t border-[#e3d7ca] pt-2.5">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#8c7465]">
                  {isChinese ? '体验标签（可多选）' : 'Highlights (multi-select)'}
                </p>
                <span className="text-[10.5px] text-[#9c8475]">
                  {isChinese ? `已选 ${selectedTagIds.length}` : `${selectedTagIds.length} selected`}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
              {merchant.experienceTags.map((tag) => {
                const isSelected = selectedTagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className={`rounded-xl px-2.5 py-1 text-xs font-medium transition active:scale-95 flex items-center gap-1 border ${
                      isSelected
                        ? 'border-[#996d51] bg-[#996d51] text-white shadow-xs'
                        : 'border-[#dfd0bf] bg-white text-[#6b5444] hover:bg-[#faf4ee]'
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3 shrink-0" />}
                    <span>{isChinese ? tag.label : tag.googleLabel}</span>
                  </button>
                );
              })}
              </div>
            </div>
          </div>

          {/* ② 平台与口吻 */}
          <div className="space-y-1.5">
            <label className="flex min-w-0 items-center gap-1.5 text-xs font-bold text-[#4a362b]">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#8c674e] text-[10px] text-white font-bold">
                2
              </span>
              <span>{isChinese ? '平台与口吻' : 'Platform & Tone'}</span>
            </label>
            <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
              <span className="w-fit rounded-lg border border-[#dccbb9] bg-[#efe5d7] px-2.5 py-1 text-xs font-bold text-[#624b3c]">
                {getPlatformName(platform)}
              </span>
              <div className="flex min-w-0 w-full items-center gap-1 rounded-xl border border-[#dfcebc] bg-[#eee3d5]/70 p-1 sm:flex-1">
                {voiceOptions.map((opt) => {
                  const isSelected = voice === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleVoiceChange(opt.value)}
                      className={`min-w-0 flex-1 rounded-lg py-1 text-center text-[11px] font-bold transition ${
                        isSelected
                          ? 'bg-white text-[#523d30] shadow-xs'
                          : 'text-[#8c7464] hover:text-[#523d30]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ③ 自定义输入（默认折叠在下方，展开可填，500 字上限有计数，验收 #18） */}
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => setIsExperienceOpen(!isExperienceOpen)}
              className="w-full flex items-center justify-between rounded-xl border border-[#dec9b5] bg-white/70 px-3 py-2 text-xs font-bold text-[#4a362b] hover:bg-white transition"
            >
              <span className="flex min-w-0 items-center gap-1.5 text-left">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#8c674e] text-[10px] text-white font-bold">
                  3
                </span>
                <span className="min-w-0">{isChinese ? '你想说点什么（选填，建议填写）' : 'What would you like to say? (optional, recommended)'}</span>
              </span>
              <span className="text-[11px] font-semibold text-[#8b6147]">
                {isExperienceOpen ? (isChinese ? '收起 ▲' : 'Collapse ▲') : (isChinese ? '展开输入 ▼' : 'Expand ▼')}
              </span>
            </button>

            {isExperienceOpen && (
              <div className="space-y-1 pt-1">
                <textarea
                  value={experience}
                  maxLength={500}
                  onChange={(e) => handleExperienceChange(e.target.value)}
                  placeholder={
                    isChinese
                      ? '先写下你的真实体验，我们会帮你整理成可编辑草稿。'
                      : 'Write your real experience first; we will help polish it into an editable draft.'
                  }
                  rows={3}
                  className="w-full resize-none rounded-xl border border-[#dec9b5] bg-white p-3 text-xs sm:text-sm text-[#46352a] placeholder:text-[#b49f8f] outline-none transition focus:border-[#986a4c] focus:ring-2 focus:ring-[#986a4c]/15 shadow-inner"
                />
                <div className="flex justify-between items-center text-[10.5px] text-[#9c8475] px-1">
                  <span>{isChinese ? '具体细节会让每一版更像你本人' : 'A concrete detail makes each version sound more like you'}</span>
                  <span className="font-mono">{experience.length}/500</span>
                </div>
              </div>
            )}
          </div>

          {/* ④ 可编辑草稿 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="flex min-w-0 items-center gap-1.5 text-xs font-bold text-[#4a362b]">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#8c674e] text-[10px] text-white font-bold">
                  4
                </span>
                <span>{isChinese ? '可编辑草稿' : 'Editable draft'}</span>
              </label>
              <button
                type="button"
                onClick={() => void generateDraft(variation + 1)}
                disabled={isGenerating}
                className="text-[11px] font-semibold text-[#8b6147] hover:text-[#5e3c27] flex items-center gap-1 transition"
              >
                <RefreshCw className={`h-3 w-3 ${isGenerating ? 'animate-spin' : ''}`} />
                <span>{draft ? (isChinese ? '换一版' : 'Try another') : (isChinese ? '帮我润色' : 'Polish my review')}</span>
              </button>
            </div>
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={getDraftPlaceholder(platform)}
                rows={platform === 'xiaohongshu' || platform === 'instagram' ? 7 : 5}
                className="w-full resize-none rounded-xl border border-[#dec9b5] bg-white p-3 text-xs sm:text-sm leading-relaxed text-[#3d2d24] outline-none transition focus:border-[#986a4c] focus:ring-2 focus:ring-[#986a4c]/15 shadow-inner"
              />
            </div>
            
            {/* COMPLIANCE NOTICE (验收 #30 & #31: 内容可编辑、请自行核对、系统不会自动发布) */}
            <p className="flex items-center gap-1 text-[10.5px] text-[#91796a]">
              <ShieldCheck className="h-3.5 w-3.5 text-[#a1795c] shrink-0" />
              <span className="min-w-0">
                {isChinese
                  ? 'AI 生成内容可能有误，请核对后再发布 · 内容可编辑 · 系统不会自动发布'
                  : 'AI-generated content may be inaccurate. Please double-check before posting. You can edit anytime; the system will never publish automatically.'}
              </span>
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <p role="alert" className="rounded-xl border border-[#eac2bb] bg-[#fff1ee] px-3 py-2 text-xs leading-5 text-[#a04339]">
              {error}
            </p>
          )}

          {/* Copied Success Notice */}
          {isCopied && (
            <div className="flex items-center justify-center gap-1.5 rounded-xl bg-[#ecfdf5] border border-[#a7f3d0] py-2 px-3 text-xs font-semibold text-[#065f46]">
              <Check className="h-3.5 w-3.5 text-[#059669]" />
              <span>{getCopiedLabel(platform)}</span>
            </div>
          )}

          {/* 复制并前往平台 (BOTTOM CTA BUTTON) */}
          <button
            type="button"
            disabled={!draft.trim() || isGenerating}
            onClick={() => void copyAndOpen()}
            className={`flex w-full min-w-0 items-center justify-center gap-2 rounded-2xl px-3 py-3.5 text-center text-sm font-bold text-white shadow-md transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 ${style.copyButton}`}
          >
            {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            <span className="min-w-0">{isChinese ? '复制并前往平台' : `Copy & Open ${getPlatformName(platform)}`}</span>
            <ExternalLink className="h-3.5 w-3.5 opacity-80" />
          </button>
        </div>
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
  const logoUrl = platform === 'google'
    ? '/platforms/google.png'
    : platform === 'xiaohongshu'
      ? '/platforms/xiaohongshu.png'
      : platform === 'yelp'
        ? '/platforms/yelp.png'
        : '/platforms/instagram.png';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold ${className}`}>
      <img src={logoUrl} alt={platform} className="h-3.5 w-3.5 object-contain rounded-full" />
      <span>{getPlatformName(platform)}</span>
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

  if (platform === 'yelp') {
    return buildYelpReviewDraft({ merchant, serviceText, tagText, note, voice });
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
  const service = serviceText || 'appointment';
  const highlights = tagText || 'calm atmosphere and attentive service';
  const noteClean = note && !/[\u4e00-\u9fff]/.test(note) ? withEnglishPunctuation(note) : '';

  if (voice === 'concise') {
    return `Had a truly wonderful visit to ${merchant.name} in ${merchant.neighborhood} for their ${service}. ${highlights} really stood out to me from the start. ${noteClean ? noteClean + ' ' : ''}The space was spotless, unhurried, and comfortable throughout. The team took genuine care with every step of the appointment. A very enjoyable and relaxing experience overall, and I look forward to coming back again soon!`;
  }
  if (voice === 'warm') {
    return `Such a lovely, restorative visit to ${merchant.name} in ${merchant.neighborhood}! I booked an appointment for their ${service}, and from the moment I arrived, ${highlights.toLowerCase()} made me feel completely at ease. ${noteClean ? noteClean + ' ' : ''}The environment felt so calm, clean, and genuinely welcoming. Every single detail showed skilled care and attention. Left feeling completely refreshed, and I would gladly recommend them to anyone in the area.`;
  }
  return `Really enjoyed my visit to ${merchant.name} in ${merchant.neighborhood} for the ${service}. ${highlights} was fantastic and made the entire experience super relaxing. ${noteClean ? noteClean + ' ' : ''}Everything felt immaculate, comfortable, and very thoughtfully handled without any feeling of being rushed. The staff was attentive and professional the whole time. A fantastic local spot that I definitely look forward to visiting again.`;
}

function buildYelpReviewDraft({
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
  const service = serviceText || 'service';
  const highlights = tagText || 'peaceful space, skilled care, and thoughtful staff';
  const noteClean = note && !/[\u4e00-\u9fff]/.test(note) ? withEnglishPunctuation(note) : '';

  if (voice === 'concise') {
    return `Came to ${merchant.name} in ${merchant.neighborhood} and had a fantastic appointment. Booked their ${service}, and the overall quality was evident right away. What stood out most was the ${highlights.toLowerCase()}. ${noteClean ? noteClean + ' ' : ''}The facility is spotless, quiet, and well-managed, and the staff took the time to explain everything clearly without any pressure. Highly recommend them for anyone looking for consistent, professional care in the area. Will definitely be returning for another appointment.`;
  }
  return `I booked a visit to ${merchant.name} in ${merchant.neighborhood} for their ${service}, and it exceeded my expectations. Check-in was smooth, and the entire space felt peaceful and exceptionally clean. What stood out most was the ${highlights.toLowerCase()}. ${noteClean ? noteClean + ' ' : ''}The staff was patient, knowledgeable, and genuinely attentive from beginning to end. It is rare to find a business that balances technical skill with such a welcoming environment. A standout spot that I will happily revisit and recommend to friends.`;
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
  const tagList = tagText ? tagText.toLowerCase() : 'peaceful and refreshing vibes';
  const noteClean = note && !/[\u4e00-\u9fff]/.test(note) ? withEnglishPunctuation(note) : '';

  const mention = merchant.socialHandles?.instagram
    ? ` @${merchant.socialHandles.instagram.replace(/^@/, '')}`
    : '';

  const hashtags = [
    hashtagFromText(merchant.name),
    ...serviceText.split(' and ').map(hashtagFromText),
    '#SelfCare',
    '#SpaDay',
    '#WeekendVibes',
    '#WellnessJourney',
    '#CleanSpace',
  ].filter(Boolean).slice(0, 8).join(' ');

  return `Self-care afternoon at ${merchant.name}${mention} ✨\n\nTried their ${service} today. Loving the ${tagList}. ${noteClean ? noteClean + ' ' : ''}The entire atmosphere felt so calming, clean, and restorative.\n\nLeft feeling completely refreshed and grounded 🤍\n\n${hashtags}`;
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

  const mention = merchant.socialHandles?.xiaohongshu
    ? ` @${merchant.socialHandles.xiaohongshu.replace(/^@/, '')}`
    : '';

  const titles = [
    `✨在${merchant.neighborhood}挖到超治愈的${service}！`,
    `💆周末放松指南｜${merchant.name}打卡`,
    `🌿私藏的${service}治愈小天地分享`,
  ];
  const title = titles[0];

  const detail = noteClean
    ? `我自己的感受是：${noteClean}`
    : `全程体验下来最大的感受就是【${tagsStr}】。`;

  const body = `这次在${merchant.name}${mention}做了${service}，体验感真的拉满！\n\n${detail}空间干净私密，轻音乐伴随精油香气让人很快就沉静下来。技师细致周到，完全没有催促感，做完身心都得到了彻底的舒缓与放松～`;

  const hashTags = [
    hashtagFromText(merchant.neighborhood.replace(/[^a-zA-Z]/g, '') || 'Baltimore') + '探店',
    '#美容护理',
    hashtagFromText(service),
    '#沉浸式SPA',
    '#周末放松',
  ].filter(Boolean).slice(0, 5).join(' ');

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
  if (platform === 'yelp') return 'Yelp review link is not configured yet. Please try again later.';
  if (platform === 'instagram') return 'Instagram destination is not configured yet. Please try again later.';
  return 'Google Maps review link is not configured yet. Please try again later.';
}

function getWebFallback(merchant: PublicReviewMerchant, platform: PublicReviewPlatform) {
  const configuredFallback = merchant.platforms[platform]?.fallbackUrl;
  if (configuredFallback?.startsWith('http')) return configuredFallback;
  if (platform === 'xiaohongshu') {
    return `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(merchant.name)}`;
  }
  return 'https://www.instagram.com/create/style/';
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
            ? '正在尝试打开小红书 App。没有唤起时，可点击下方按钮重试或使用网页入口。'
            : 'We are trying to open Instagram. If the app does not open, use the button below or continue on the web.'}
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
        {isXiaohongshu && (
          <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200/80 p-3 text-left text-xs text-amber-900 flex items-start gap-2">
            <span className="shrink-0 text-base leading-none">💡</span>
            <span><strong>发布提示：</strong>小红书暂不支持剪贴板自动 @，粘贴文案后请在编辑页手动输入 @ 提及门店。</span>
          </div>
        )}
        <div className="mt-4 rounded-2xl border border-[#eadbc9] bg-white p-4 text-left">
          <p className="text-xs font-semibold text-[#5b4738]">{isXiaohongshu ? '如果 App 没有打开' : 'If Instagram does not open'}</p>
          <p className="mt-1 text-xs leading-5 text-[#8b7566]">
            {isXiaohongshu ? '文案仍在剪贴板中。你可以手动打开 App 粘贴，或先进入网页搜索页。' : 'Your caption remains copied. Open the app manually, or continue to the web site.'}
          </p>
          <a href={webFallback} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#8b5f44] hover:text-[#5d3e2c]">
            {isXiaohongshu ? '打开小红书网页搜索' : 'Open Instagram on the web'} <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
        <p className="mt-4 text-[10.5px] text-[#91796a] text-center">
          {isXiaohongshu ? 'AI 生成内容可能有误，请核对后再发布 · 内容可编辑 · 系统不会自动发布' : 'AI-generated content may be inaccurate. Please double-check before posting. You can edit anytime; the system will never publish automatically.'}
        </p>
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

async function clearClipboard() {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText('');
    }
  } catch {
    // Clipboard permissions vary by browser. The visible draft is still cleared.
  }
}

function draftEdgeFragments(value: string): string[] {
  const sentences = value
    .replace(/#[^\s#]+/g, '')
    .split(/(?<=[.!?。！？])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const first = sentences[0];
  const last = sentences.at(-1);
  return [first, last]
    .filter((sentence): sentence is string => Boolean(sentence))
    .map((sentence) => sentence.slice(0, 160));
}

function fingerprintDraft(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[\p{P}\p{S}]/gu, '')
    .trim();
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
