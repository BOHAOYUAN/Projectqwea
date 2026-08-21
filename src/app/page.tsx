'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Plus,
  Globe,
  Loader2,
  Edit3,
  ExternalLink,
  Bot,
} from 'lucide-react';

// 1. 预置关键词标签（中英双语）
interface TagItem {
  id: string;
  zh: string;
  en: string;
}

const PRESET_TAGS: TagItem[] = [
  { id: 'handmade', zh: '手工现熬', en: 'Handmade & fresh' },
  { id: 'chewy', zh: '珍珠筋道', en: 'Super chewy boba' },
  { id: 'sweetness', zh: '甜度适中', en: 'Balanced sweetness' },
  { id: 'quality', zh: '真材实料', en: 'High quality ingredients' },
  { id: 'portion', zh: '分量足', en: 'Generous portions' },
  { id: 'speed', zh: '出餐超快', en: 'Fast service' },
  { id: 'vibe', zh: '环境出片', en: 'Cozy & aesthetic vibe' },
  { id: 'clean', zh: '干净卫生', en: 'Clean & hygienic' },
];

// 2. 界面双语文字字典
const I18N = {
  zh: {
    headerTitle: 'Sunny Tea House 🧋',
    badge: 'San Jose',
    headerSub: '顾客打卡评价助手 · 轻松生成并一键发布',
    langToggle: 'English',
    sectionTags: '1. 猜你想要（点击多选）',
    customTagBtn: '+ 自定义关键词',
    customPlaceholder: '输入其他想提到的特点（如：奶香浓郁、停车方便）',
    customAdd: '添加',
    sectionPlatform: '2. 选择发布目标平台',
    googleTitle: 'Google',
    googleSub: '北美本地客观英文',
    xhsTitle: '小红书',
    xhsSub: '爆款种草 · Emoji 排版',
    btnGenerate: '✨ AI 生成评价',
    btnGenerating: '⏳ AI 正在构思地道文案...',
    sectionPreview: '3. 评价内容预览',
    editableHint: '(可直接点击编辑修改)',
    btnRegenerate: '🔄 换一批',
    btnCopy: '📋 一键复制并前往',
    btnCopySuffix: '发布',
    copyHint: '点击将自动复制文案并打开对应平台的发布页面',
    toastSuccess: '✅ 已复制，请去粘贴发布',
    bonusTitle: '🤖 附加题：企微群工作流',
    bonusReady: '已就绪',
    bonusShow: '查看 AI摘要与回复草稿 ▼',
    bonusHide: '收起 ▲',
    bonusSummary: '📌 AI 核心中文摘要 (20字)：',
    bonusReply: '💬 建议老板感谢回复草稿 (50字)：',
    bonusStatus: '📡 Webhook: 数据已组装并模拟分发',
    disclaimer: '⚠️ AI 内容仅供参考，发布前请仔细核实',
    wordUnitEn: 'Words',
    wordUnitZh: '字',
  },
  en: {
    headerTitle: 'Sunny Tea House 🧋',
    badge: 'San Jose',
    headerSub: 'Customer Review Assistant · Generate & Post in 1-Click',
    langToggle: '中文',
    sectionTags: '1. Guess what you want to say (Multi-select)',
    customTagBtn: '+ Custom Tag',
    customPlaceholder: 'Add other highlights (e.g. easy parking, rich milk tea)',
    customAdd: 'Add',
    sectionPlatform: '2. Choose Target Platform',
    googleTitle: 'Google',
    googleSub: 'Authentic Local English',
    xhsTitle: 'Xiaohongshu',
    xhsSub: 'Trending Post · Emoji Layout',
    btnGenerate: '✨ Generate Review',
    btnGenerating: '⏳ Crafting authentic review...',
    sectionPreview: '3. Review Preview',
    editableHint: '(Click directly to edit)',
    btnRegenerate: '🔄 Regenerate',
    btnCopy: '📋 Copy & Go to',
    btnCopySuffix: 'Post',
    copyHint: 'Click to copy text and open the target platform page',
    toastSuccess: '✅ Copied to clipboard! Ready to paste & publish',
    bonusTitle: '🤖 Bonus: WeCom Workflow',
    bonusReady: 'Ready',
    bonusShow: 'View AI Summary & Reply Draft ▼',
    bonusHide: 'Collapse ▲',
    bonusSummary: '📌 AI Chinese Summary (20 words):',
    bonusReply: '💬 Merchant Thank-You Reply Draft (50 words):',
    bonusStatus: '📡 Webhook: Payload assembled & simulated',
    disclaimer: '⚠️ AI-generated content is for reference only. Please review before posting.',
    wordUnitEn: 'Words',
    wordUnitZh: 'Characters',
  },
};

export default function HomePage() {
  // 语言状态
  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  const t = I18N[lang];

  // 选中的标签列表
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(['handmade', 'chewy', 'speed']);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState<string>('');
  const [showCustomInput, setShowCustomInput] = useState<boolean>(false);

  // 平台选择 (Google vs 小红书)
  const [platform, setPlatform] = useState<'Google' | '小红书'>('小红书');

  // 生成状态
  const [generatedReview, setGeneratedReview] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showCopyToast, setShowCopyToast] = useState<boolean>(false);

  // 附加题 Webhook 数据
  const [webhookData, setWebhookData] = useState<{
    summary: string;
    replyDraft: string;
  } | null>(null);
  const [showWebhookDrawer, setShowWebhookDrawer] = useState<boolean>(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 文本框高度随内容自动撑高
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(120, textareaRef.current.scrollHeight)}px`;
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
      setErrorMessage(lang === 'zh' ? '请先点击上方按钮生成评价内容' : 'Please generate review first');
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

      // 智能 Deep Linking 跳转
      setTimeout(() => {
        if (platform === 'Google') {
          window.open(
            'https://www.google.com/maps/search/?api=1&query=Sunny+Tea+House+San+Jose+CA',
            '_blank'
          );
        } else {
          // 小红书有效搜索/打卡结果页
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

  // 单词/字符统计
  const countDisplay =
    platform === 'Google'
      ? `${generatedReview.trim() ? generatedReview.trim().split(/\s+/).filter(Boolean).length : 0} ${t.wordUnitEn}`
      : `${generatedReview.length} ${t.wordUnitZh}`;

  return (
    <div className="min-h-screen bg-[#F4F4F5] flex flex-col justify-start sm:justify-center items-center p-4 sm:py-8 font-sans antialiased text-slate-800 selection:bg-red-500 selection:text-white">
      
      {/* 绿色 Toast 提示 (居中弹窗) */}
      {showCopyToast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white text-xs sm:text-sm font-bold px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2 transition-all animate-bounce">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{t.toastSuccess}</span>
        </div>
      )}

      {/* 移动端 H5 容器 (max-width: 420px 居中纯白卡片) */}
      <main className="w-full max-w-[420px] bg-white rounded-3xl shadow-sm border border-slate-200/80 p-5 sm:p-6 space-y-5">
        
        {/* Header 顶部与中英双语切换 */}
        <header className="space-y-1 text-left pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                {t.headerTitle}
              </h1>
              <span className="text-[10px] font-bold bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                {t.badge}
              </span>
            </div>

            {/* 中英双语切换按钮 */}
            <button
              type="button"
              onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
              className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 min-h-[36px]"
            >
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              <span>{t.langToggle}</span>
            </button>
          </div>
          <p className="text-xs text-slate-500">
            {t.headerSub}
          </p>
        </header>

        {/* 错误提示条 */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl p-3.5 font-medium leading-relaxed animate-fadeIn">
            ⚠️ {errorMessage}
          </div>
        )}

        {/* 1. 猜你想要：关键词胶囊多选区 */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 tracking-wide">
              {t.sectionTags}
            </label>
            <span className="text-[11px] font-mono font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
              已选 {selectedTagIds.length + customTags.length} 项
            </span>
          </div>

          {/* 胶囊标签集合 */}
          <div className="flex flex-wrap gap-2">
            {PRESET_TAGS.map((tag) => {
              const isSelected = selectedTagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => handleTagToggle(tag.id)}
                  className={`min-h-[40px] px-3.5 py-2 rounded-full text-xs font-semibold transition-all select-none flex items-center gap-1 active:scale-95 ${
                    isSelected
                      ? 'bg-amber-500 text-white shadow-xs ring-2 ring-amber-500/20'
                      : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{lang === 'zh' ? tag.zh : tag.en}</span>
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </button>
              );
            })}

            {/* 自定义添加的关键词标签 */}
            {customTags.map((tag) => (
              <span
                key={tag}
                className="min-h-[40px] px-3.5 py-2 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-300 flex items-center gap-1.5 select-none"
              >
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveCustomTag(tag)}
                  className="w-3.5 h-3.5 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center text-[10px] hover:bg-amber-300"
                >
                  ×
                </button>
              </span>
            ))}

            {/* “+ 自定义” 按钮 */}
            <button
              type="button"
              onClick={() => setShowCustomInput(!showCustomInput)}
              className="min-h-[40px] px-3.5 py-2 rounded-full text-xs font-semibold bg-slate-50 text-slate-500 border border-dashed border-slate-300 hover:bg-slate-100 flex items-center gap-1 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.customTagBtn}</span>
            </button>
          </div>

          {/* 展开的自定义输入框 */}
          {showCustomInput && (
            <div className="flex gap-2 pt-1 animate-fadeIn">
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCustomTag()}
                placeholder={t.customPlaceholder}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-amber-500 focus:bg-white transition-all font-sans"
              />
              <button
                type="button"
                onClick={handleAddCustomTag}
                className="bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-xl active:scale-95"
              >
                {t.customAdd}
              </button>
            </div>
          )}
        </section>

        {/* 2. 目标平台选择 */}
        <section className="space-y-2.5">
          <label className="text-xs font-bold text-slate-800 tracking-wide block">
            {t.sectionPlatform}
          </label>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => {
                setPlatform('Google');
                setErrorMessage('');
              }}
              className={`min-h-[44px] p-3 rounded-2xl text-xs font-bold transition-all border text-left flex flex-col gap-0.5 ${
                platform === 'Google'
                  ? 'bg-blue-50 border-blue-500 text-blue-950 shadow-xs ring-2 ring-blue-500/20'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>🌐 {t.googleTitle}</span>
                {platform === 'Google' && <Check className="w-3.5 h-3.5 text-blue-600 stroke-[3]" />}
              </div>
              <span className="text-[10px] text-slate-500 font-normal">{t.googleSub}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setPlatform('小红书');
                setErrorMessage('');
              }}
              className={`min-h-[44px] p-3 rounded-2xl text-xs font-bold transition-all border text-left flex flex-col gap-0.5 ${
                platform === '小红书'
                  ? 'bg-rose-50 border-rose-500 text-rose-950 shadow-xs ring-2 ring-rose-500/20'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>📕 {t.xhsTitle}</span>
                {platform === '小红书' && <Check className="w-3.5 h-3.5 text-rose-600 stroke-[3]" />}
              </div>
              <span className="text-[10px] text-slate-500 font-normal">{t.xhsSub}</span>
            </button>
          </div>
        </section>

        {/* 3. 首次生成主按钮 (未生成时显示大按钮) */}
        {!generatedReview && (
          <div>
            <button
              type="button"
              disabled={isLoading}
              onClick={handleGenerate}
              className="w-full min-h-[48px] py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-[0.98] disabled:opacity-75 disabled:cursor-not-allowed text-white font-extrabold text-sm shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t.btnGenerating}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 fill-white" />
                  <span>{t.btnGenerate}</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* 4. 评价生成预览区：支持直接点击编辑 + 换一批重新生成 */}
        {generatedReview && (
          <section className="space-y-3 pt-1 animate-fadeIn">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                <span>{t.sectionPreview}</span>
                <span className="text-slate-400 font-normal text-[10px]">{t.editableHint}</span>
              </label>

              {/* 换一批，重新生成按钮 */}
              <button
                type="button"
                disabled={isLoading}
                onClick={handleGenerate}
                className="text-[11px] font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-all active:scale-95 disabled:opacity-50 min-h-[30px]"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin text-amber-600' : ''}`} />
                <span>{isLoading ? '生成中...' : t.btnRegenerate}</span>
              </button>
            </div>

            {/* 可编辑多行文本框 */}
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={generatedReview}
                onChange={(e) => setGeneratedReview(e.target.value)}
                rows={4}
                className="w-full p-4 pb-7 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-xs sm:text-[13px] leading-relaxed outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20 transition-all resize-none overflow-hidden font-sans"
              />
              {/* 底部右侧悬浮字数统计 */}
              <span className="absolute bottom-2.5 right-3 text-[10px] text-slate-400 font-mono select-none">
                {countDisplay}
              </span>
            </div>

            {/* 醒目的高对比度主操作按钮：一键复制并前往发布 */}
            <button
              type="button"
              disabled={isLoading || !generatedReview.trim()}
              onClick={handleCopyAndRedirect}
              className={`w-full min-h-[48px] py-3.5 px-4 rounded-2xl text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.98] ${
                platform === 'Google'
                  ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20'
                  : 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20'
              }`}
            >
              <Copy className="w-4 h-4" />
              <span>
                {t.btnCopy} {platform === 'Google' ? 'Google' : '小红书'} {t.btnCopySuffix}
              </span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </button>

            <p className="text-[10px] text-center text-slate-400">
              {t.copyHint}
            </p>

            {/* 附加题：企微群工作流折叠抽屉 (优雅克制) */}
            {webhookData && (
              <div className="pt-2 border-t border-slate-100">
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
                  <div className="mt-2 p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-2.5 text-xs animate-fadeIn">
                    <div>
                      <span className="text-emerald-900 font-bold block text-[10px]">
                        {t.bonusSummary}
                      </span>
                      <p className="mt-0.5 text-slate-800 font-semibold text-[11px]">
                        {webhookData.summary}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-emerald-100">
                      <span className="text-emerald-900 font-bold block text-[10px]">
                        {t.bonusReply}
                      </span>
                      <p className="mt-1 text-slate-700 bg-white p-2.5 rounded-xl border border-emerald-100 leading-relaxed text-[11px] shadow-xs">
                        {webhookData.replyDraft}
                      </p>
                    </div>
                    <div className="text-[9px] text-emerald-600/90 flex items-center justify-between pt-1 border-t border-emerald-100/60 font-mono">
                      <span>{t.bonusStatus}</span>
                      <span className="font-bold">HTTP 200 OK</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* 底部免责声明 */}
        <footer className="pt-2 text-center border-t border-slate-100">
          <p className="text-[10px] text-slate-400 leading-tight">
            {t.disclaimer}
          </p>
        </footer>

      </main>

    </div>
  );
}
