'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Plus,
  Edit3,
  ExternalLink,
  Bot,
  X,
  MoreHorizontal,
  Globe,
  Loader2,
} from 'lucide-react';

// 1. 预置关键词标签（中英双语）
interface TagItem {
  id: string;
  zh: string;
  en: string;
}

const PRESET_TAGS: TagItem[] = [
  { id: 'handmade', zh: '手工拉面', en: 'Handmade noodles' },
  { id: 'chewy', zh: '筋道', en: 'Super bouncy & chewy' },
  { id: 'affordable', zh: '实惠', en: 'Great value' },
  { id: 'portion', zh: '分量足', en: 'Huge portions' },
  { id: 'clean', zh: '干净卫生', en: 'Clean & hygienic' },
  { id: 'vibe', zh: '氛围好', en: 'Cozy atmosphere' },
  { id: 'broth', zh: '清汤浓郁', en: 'Rich clear broth' },
  { id: 'spicy', zh: '油泼辣子香', en: 'Aromatic chili oil' },
];

// 2. 界面双语文字字典
const I18N = {
  zh: {
    transBtn: '全文翻译 >',
    optSuccessGoogle: 'Google 评价已为您优化完成：',
    optSuccessXhs: '小红书种草文案已为您优化完成：',
    sectionTags: '猜你想要（点击多选）',
    customTagBtn: '+ 自定义',
    customPlaceholder: '输入其他特点（如：肉片厚实）',
    customAdd: '添加',
    sectionPlatform: '选择发布平台',
    googleTitle: 'Google',
    xhsTitle: '小红书',
    btnGenerate: '✨ AI 生成评价',
    btnGenerating: '⏳ 正在构思地道文案...',
    btnEdit: '编辑',
    btnRegenerate: '换一批',
    disclaimer: 'AI content is for reference only. Please verify before publishing.',
    disclaimerZh: 'AI 内容仅供参考，发布前请仔细核实。',
    btnCopy: 'Copy and publish',
    btnCopyZh: '复制并发布',
    toastSuccess: '✅ 已复制，请去粘贴发布',
    bonusTitle: '🤖 附加题：企微工作流',
    bonusReady: '已就绪',
    bonusShow: '查看 AI摘要与回复草稿 ▼',
    bonusHide: '收起 ▲',
    bonusSummary: '📌 AI 核心中文摘要 (20字)：',
    bonusReply: '💬 建议老板感谢回复草稿 (50字)：',
    bonusStatus: '📡 Webhook: 数据已组装并模拟分发',
    wordUnitEn: 'Words',
    wordUnitZh: '字',
  },
  en: {
    transBtn: 'Translate >',
    optSuccessGoogle: 'Google Review review has been optimized for you:',
    optSuccessXhs: 'Xiaohongshu post has been optimized for you:',
    sectionTags: 'Guess what you want to say (Multi-select)',
    customTagBtn: '+ Custom',
    customPlaceholder: 'Add other highlights (e.g. thick beef slices)',
    customAdd: 'Add',
    sectionPlatform: 'Select Platform',
    googleTitle: 'Google',
    xhsTitle: 'Xiaohongshu',
    btnGenerate: '✨ Generate Review',
    btnGenerating: '⏳ Crafting review...',
    btnEdit: 'Edit',
    btnRegenerate: 'Regenerate',
    disclaimer: 'AI content is for reference only. Please verify before publishing.',
    disclaimerZh: 'AI content is for reference only. Please verify before publishing.',
    btnCopy: 'Copy and publish',
    btnCopyZh: 'Copy and publish',
    toastSuccess: '✅ Copied to clipboard! Ready to paste & publish',
    bonusTitle: '🤖 Bonus: WeCom Workflow',
    bonusReady: 'Ready',
    bonusShow: 'View AI Summary & Reply Draft ▼',
    bonusHide: 'Collapse ▲',
    bonusSummary: '📌 AI Chinese Summary (20 words):',
    bonusReply: '💬 Merchant Thank-You Reply Draft (50 words):',
    bonusStatus: '📡 Webhook: Payload assembled & simulated',
    wordUnitEn: 'Words',
    wordUnitZh: 'Characters',
  },
};

export default function HomePage() {
  // 语言状态
  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  const t = I18N[lang];

  // 选中的标签列表
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(['handmade', 'chewy', 'broth']);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState<string>('');
  const [showCustomInput, setShowCustomInput] = useState<boolean>(false);

  // 平台选择 (Google vs 小红书)
  const [platform, setPlatform] = useState<'Google' | '小红书'>('Google');

  // 生成状态
  const [generatedReview, setGeneratedReview] = useState<string>(
    'That Lanzhou beef noodle soup was something else. The clear broth had such a deep taste, and those noodles were so bouncy (my friend recommended it for my solo lunch). Not as spicy as I thought but still really good.'
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showCopyToast, setShowCopyToast] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // 附加题 Webhook 数据
  const [webhookData, setWebhookData] = useState<{
    summary: string;
    replyDraft: string;
  } | null>({
    summary: '顾客高度评价了手工拉面的筋道口感与浓郁汤底。',
    replyDraft: '亲爱的顾客，非常感谢您的喜爱与支持，期待很快再次为您制作美味拉面！',
  });
  const [showWebhookDrawer, setShowWebhookDrawer] = useState<boolean>(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 文本框高度随内容自动撑高
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(130, textareaRef.current.scrollHeight)}px`;
    }
  }, [generatedReview]);

  // 标签点击切换
  const handleTagToggle = (id: string) => {
    setErrorMessage('');
    if (selectedTagIds.includes(id)) {
      setSelectedTagIds(selectedTagIds.filter((item) => item !== id));
    } else {
      setSelectedTagIds([...selectedTagIds, id]);
    }
  };

  // 添加自定义标签
  const handleAddCustomTag = () => {
    const trimmed = customInput.trim();
    if (trimmed && !customTags.includes(trimmed)) {
      setCustomTags([...customTags, trimmed]);
      setCustomInput('');
    }
  };

  // 删除自定义标签
  const handleRemoveCustomTag = (tag: string) => {
    setCustomTags(customTags.filter((t) => t !== tag));
  };

  // 聚合所有已选标签
  const getAllSelectedTags = () => {
    const presetLabels = selectedTagIds.map(
      (id) => PRESET_TAGS.find((item) => item.id === id)?.zh || id
    );
    return [...presetLabels, ...customTags];
  };

  // 核心：调用 AI 生成或换一批重新生成
  const handleGenerate = async () => {
    const allTags = getAllSelectedTags();
    if (allTags.length === 0) {
      setErrorMessage(lang === 'zh' ? '请至少选择或输入 1 个关键词标签！' : 'Please select at least 1 tag!');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          tags: allTags,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'AI 生成评价失败，请稍后重试');
      }

      setGeneratedReview(data.review || '');
      if (data.summary && data.replyDraft) {
        setWebhookData({
          summary: data.summary,
          replyDraft: data.replyDraft,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '网络请求遇到异常，请检查后重试';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // 核心：一键复制并智能跳转
  const handleCopyAndRedirect = async () => {
    if (!generatedReview.trim()) {
      setErrorMessage(lang === 'zh' ? '请先生成评价内容' : 'Please generate review first');
      return;
    }

    try {
      // 写入剪贴板
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(generatedReview);
      } else {
        const tempText = document.createElement('textarea');
        tempText.value = generatedReview;
        document.body.appendChild(tempText);
        tempText.select();
        document.execCommand('copy');
        document.body.removeChild(tempText);
      }

      // 弹出绿色轻提示 Toast (1.5s 自动消失)
      setShowCopyToast(true);
      setTimeout(() => setShowCopyToast(false), 1500);

      // 智能跳转
      setTimeout(() => {
        if (platform === 'Google') {
          window.open(
            'https://www.google.com/maps/search/?api=1&query=Sunny+Tea+House+San+Jose+CA',
            '_blank'
          );
        } else {
          const xhsWebUrl = 'https://www.xiaohongshu.com/search_result?keyword=Sunny%20Tea%20House';
          const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
          if (isMobile) {
            const timer = setTimeout(() => {
              window.open(xhsWebUrl, '_blank');
            }, 1200);
            window.location.href = 'xhsdiscover://search/result?keyword=Sunny%20Tea%20House';
            window.addEventListener('pagehide', () => clearTimeout(timer), { once: true });
          } else {
            window.open(xhsWebUrl, '_blank');
          }
        }
      }, 700);
    } catch {
      setErrorMessage(lang === 'zh' ? '复制失败，请长按手动全选复制' : 'Copy failed, please copy manually');
    }
  };

  // 点击 Edit 按钮聚焦文本框
  const handleFocusEdit = () => {
    setIsEditing(true);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F7] flex flex-col justify-start sm:justify-center items-center font-sans antialiased text-slate-800 selection:bg-red-500 selection:text-white">
      
      {/* 绿色 Toast 提示 (居中弹窗) */}
      {showCopyToast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white text-xs sm:text-sm font-bold px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2 transition-all animate-bounce">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{t.toastSuccess}</span>
        </div>
      )}

      {/* 移动端 H5 容器 (100% 还原截图美学风格) */}
      <main className="w-full max-w-[420px] bg-white min-h-screen sm:min-h-0 sm:rounded-3xl shadow-sm border-x sm:border border-slate-200/80 p-4 sm:p-5 flex flex-col justify-between space-y-4">
        
        <div className="space-y-4">
          
          {/* 1. 顶部 Header 状态栏：✕ | 🔤 全文翻译 > | ··· */}
          <header className="flex items-center justify-between pt-1 pb-2">
            <button
              type="button"
              onClick={() => alert('返回上一页')}
              className="w-8 h-8 flex items-center justify-center text-slate-700 active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>

            {/* 顶栏居中“全文翻译 >”胶囊 */}
            <button
              type="button"
              onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
              className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-2xs transition-all active:scale-95"
            >
              <span className="text-sm">🔤</span>
              <span>{t.transBtn}</span>
            </button>

            <button
              type="button"
              className="w-8 h-8 flex items-center justify-center text-slate-700 active:scale-95"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </header>

          {/* 2. 绿色完成状态标题：✔ Google Review review has been optimized for you: */}
          <div className="flex items-start gap-2 pt-1">
            <span className="text-emerald-500 font-bold text-sm mt-0.5">✔</span>
            <p className="text-emerald-600 font-bold text-xs sm:text-[13px] leading-snug">
              {platform === 'Google' ? t.optSuccessGoogle : t.optSuccessXhs}
            </p>
          </div>

          {/* 3. 核心卡片容器：内嵌可编辑文本与 [✎ Edit] [🔄 Regenerate] 胶囊按钮 */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3.5 focus-within:border-slate-400 transition-all">
            
            {/* 可编辑文本域 */}
            <textarea
              ref={textareaRef}
              value={generatedReview}
              onChange={(e) => setGeneratedReview(e.target.value)}
              placeholder="评价内容将在此呈现，可直接点击修改..."
              rows={5}
              className="w-full bg-transparent text-slate-800 text-[13.5px] sm:text-[14px] leading-relaxed outline-none resize-none overflow-hidden font-sans placeholder-slate-400"
            />

            {/* 卡片内部底部的两个并排操作按钮：[✎ Edit] [🔄 Regenerate] */}
            <div className="flex items-center justify-center gap-3 pt-1 border-t border-slate-100">
              <button
                type="button"
                onClick={handleFocusEdit}
                className="flex-1 max-w-[130px] min-h-[38px] py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 text-xs font-semibold shadow-2xs transition-all flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                <span>{t.btnEdit}</span>
              </button>

              <button
                type="button"
                disabled={isLoading}
                onClick={handleGenerate}
                className="flex-1 max-w-[130px] min-h-[38px] py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 text-xs font-semibold shadow-2xs transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? 'animate-spin text-red-500' : ''}`} />
                <span>{isLoading ? '...' : t.btnRegenerate}</span>
              </button>
            </div>
          </div>

          {/* 4. 猜你想要：关键词胶囊选择区（可随时增减选词） */}
          <section className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">
                {t.sectionTags}
              </label>
              <div className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                <span
                  onClick={() => setPlatform('Google')}
                  className={`cursor-pointer px-1 rounded ${platform === 'Google' ? 'text-blue-600 bg-blue-50' : 'text-slate-400'}`}
                >
                  Google
                </span>
                <span className="text-slate-300">|</span>
                <span
                  onClick={() => setPlatform('小红书')}
                  className={`cursor-pointer px-1 rounded ${platform === '小红书' ? 'text-rose-600 bg-rose-50' : 'text-slate-400'}`}
                >
                  小红书
                </span>
              </div>
            </div>

            {/* 胶囊标签网格 */}
            <div className="flex flex-wrap gap-1.5">
              {PRESET_TAGS.map((tag) => {
                const isSelected = selectedTagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleTagToggle(tag.id)}
                    className={`min-h-[34px] px-3 py-1.5 rounded-full text-xs font-medium transition-all select-none flex items-center gap-1 active:scale-95 ${
                      isSelected
                        ? 'bg-red-50 text-red-600 border border-red-400 shadow-2xs font-semibold'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{lang === 'zh' ? tag.zh : tag.en}</span>
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </button>
                );
              })}

              {customTags.map((tag) => (
                <span
                  key={tag}
                  className="min-h-[34px] px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-300 flex items-center gap-1"
                >
                  <span>{tag}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCustomTag(tag)}
                    className="w-3.5 h-3.5 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center text-[10px]"
                  >
                    ×
                  </button>
                </span>
              ))}

              <button
                type="button"
                onClick={() => setShowCustomInput(!showCustomInput)}
                className="min-h-[34px] px-3 py-1.5 rounded-full text-xs font-medium bg-white text-slate-500 border border-dashed border-slate-300 hover:bg-slate-100 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>{t.customTagBtn}</span>
              </button>
            </div>

            {/* 展开自定义输入条 */}
            {showCustomInput && (
              <div className="flex gap-2 pt-1 animate-fadeIn">
                <input
                  type="text"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCustomTag()}
                  placeholder={t.customPlaceholder}
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-red-500 font-sans"
                />
                <button
                  type="button"
                  onClick={handleAddCustomTag}
                  className="bg-slate-900 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl active:scale-95"
                >
                  {t.customAdd}
                </button>
              </div>
            )}
          </section>

          {/* 5. 免责声明文本 */}
          <p className="text-[11px] text-slate-400 text-center leading-relaxed">
            {t.disclaimer}
          </p>

          {/* 6. 醒目的红色主操作按钮：[📋 Copy and publish] */}
          <button
            type="button"
            onClick={handleCopyAndRedirect}
            className="w-full min-h-[48px] py-3.5 px-4 rounded-2xl bg-[#FF3B30] hover:bg-[#E02020] active:bg-[#CC1E1E] text-white font-bold text-sm shadow-md shadow-red-500/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <Copy className="w-4 h-4 stroke-[2.5]" />
            <span>{t.btnCopy}</span>
          </button>

          {/* 7. 附加题：企业微信工作流折叠抽屉 */}
          {webhookData && (
            <div className="pt-1 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowWebhookDrawer(!showWebhookDrawer)}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/90 flex items-center justify-between text-[11px] font-bold transition-all text-slate-700"
              >
                <span className="flex items-center gap-1.5 text-emerald-700">
                  <Bot className="w-3.5 h-3.5" />
                  <span>{t.bonusTitle}</span>
                  <span className="bg-emerald-100 text-emerald-800 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold">
                    {t.bonusReady}
                  </span>
                </span>
                <span className="text-slate-400 text-[10px] font-normal">
                  {showWebhookDrawer ? t.bonusHide : t.bonusShow}
                </span>
              </button>

              {showWebhookDrawer && (
                <div className="mt-2 p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-2 text-xs animate-fadeIn">
                  <div>
                    <span className="text-emerald-900 font-bold block text-[10px]">
                      {t.bonusSummary}
                    </span>
                    <p className="mt-0.5 text-slate-800 font-semibold text-[11px]">
                      {webhookData.summary}
                    </p>
                  </div>
                  <div className="pt-1.5 border-t border-emerald-100">
                    <span className="text-emerald-900 font-bold block text-[10px]">
                      {t.bonusReply}
                    </span>
                    <p className="mt-1 text-slate-700 bg-white p-2.5 rounded-xl border border-emerald-100 leading-relaxed text-[11px] shadow-2xs">
                      {webhookData.replyDraft}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

      </main>
    </div>
  );
}
