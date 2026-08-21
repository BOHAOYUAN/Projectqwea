'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Edit3,
  X,
  MoreHorizontal,
  Globe,
  Loader2,
  ChevronDown,
  Bot,
  ExternalLink,
} from 'lucide-react';

// 1. 预置关键词标签（中英双语，100% 对应截图）
interface TagItem {
  id: string;
  zh: string;
  en: string;
}

const PRESET_TAGS: TagItem[] = [
  { id: 'hand_pulled', zh: '手工拉面', en: 'Hand-pulled noodles' },
  { id: 'chewy', zh: '筋道', en: 'Chewy noodles' },
  { id: 'affordable', zh: '实惠', en: 'Affordable prices' },
  { id: 'portions', zh: '分量足', en: 'Generous portions' },
  { id: 'open_kitchen', zh: '明厨亮灶', en: 'Open kitchen' },
  { id: 'authentic', zh: '风味正宗', en: 'Authentic flavor' },
  { id: 'rich_broth', zh: '浓郁高汤', en: 'Rich broth' },
  { id: 'fresh_made', zh: '现点现做', en: 'Freshly made to order' },
];

// 2. 界面双语文字字典 (100% 还原截图文字)
const I18N = {
  zh: {
    transBtn: '全文翻译 >',
    langSelect: '中文',
    heroTitle: '写下评价或选择关键词',
    inputPlaceholder: '简单输入您的用餐感受或补充关键词...',
    sectionTags: '猜你想要',
    btnGenerate: '✨ AI 生成地道英文评价',
    btnGenerating: '⏳ 正在构思地道文案...',
    optSuccess: 'Google 评价已为您优化完成：',
    btnEdit: 'Edit',
    btnEditZh: '编辑',
    btnRegenerate: 'Regenerate',
    btnRegenerateZh: '换一批',
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
  },
  en: {
    transBtn: '全文翻译 >',
    langSelect: 'English',
    heroTitle: 'Write your review or choose keywords',
    inputPlaceholder: 'Simple input your experience...',
    sectionTags: 'Guess what you want to say',
    btnGenerate: '✨ Generate English Review',
    btnGenerating: '⏳ Crafting authentic review...',
    optSuccess: 'Google Review review has been optimized for you:',
    btnEdit: 'Edit',
    btnEditZh: 'Edit',
    btnRegenerate: 'Regenerate',
    btnRegenerateZh: 'Regenerate',
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
  },
};

export default function HomePage() {
  // 语言状态
  const [lang, setLang] = useState<'zh' | 'en'>('en');
  const t = I18N[lang];

  // 页面状态：'input'（初始选词页面） vs 'result'（生成结果优化页面）
  const [viewState, setViewState] = useState<'input' | 'result'>('result');

  // 用户输入的自定义感受文本
  const [customExperience, setCustomExperience] = useState<string>('');

  // 选中的标签列表
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([
    'hand_pulled',
    'chewy',
    'rich_broth',
  ]);

  // 生成的评价内容（默认展示截图中原汁原味的兰州牛肉拉面英文真实评价）
  const [generatedReview, setGeneratedReview] = useState<string>(
    'That Lanzhou beef noodle soup was something else. The clear broth had such a deep taste, and those noodles were so bouncy (my friend recommended it for my solo lunch). Not as spicy as I thought but still really good.'
  );

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showCopyToast, setShowCopyToast] = useState<boolean>(false);

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
      textareaRef.current.style.height = `${Math.max(120, textareaRef.current.scrollHeight)}px`;
    }
  }, [generatedReview, viewState]);

  // 切换标签多选
  const handleTagToggle = (id: string) => {
    if (selectedTagIds.includes(id)) {
      setSelectedTagIds(selectedTagIds.filter((item) => item !== id));
    } else {
      setSelectedTagIds([...selectedTagIds, id]);
    }
  };

  // 收集所有选中的标签文本
  const getAllSelectedTags = () => {
    const presetLabels = selectedTagIds.map(
      (id) => PRESET_TAGS.find((item) => item.id === id)?.en || id
    );
    if (customExperience.trim()) {
      presetLabels.push(customExperience.trim());
    }
    return presetLabels;
  };

  // 核心：调用 AI 生成英文评价
  const handleGenerate = async () => {
    const allTags = getAllSelectedTags();
    setIsLoading(true);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'Google',
          tags: allTags.length > 0 ? allTags : ['Hand-pulled noodles', 'Chewy noodles', 'Rich broth'],
        }),
      });

      const data = await response.json();

      if (data.review) {
        setGeneratedReview(data.review);
      }
      if (data.summary && data.replyDraft) {
        setWebhookData({
          summary: data.summary,
          replyDraft: data.replyDraft,
        });
      }
      setViewState('result');
    } catch {
      // 容错保底文案
      setGeneratedReview(
        'That Lanzhou beef noodle soup was something else. The clear broth had such a deep taste, and those noodles were so bouncy (my friend recommended it for my solo lunch). Not as spicy as I thought but still really good.'
      );
      setViewState('result');
    } finally {
      setIsLoading(false);
    }
  };

  // 核心：一键复制并发布
  const handleCopyAndPublish = async () => {
    if (!generatedReview.trim()) return;

    try {
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

      setShowCopyToast(true);
      setTimeout(() => setShowCopyToast(false), 1500);

      // 打开 Google Maps 目标评价页
      setTimeout(() => {
        window.open('https://www.google.com/maps', '_blank');
      }, 700);
    } catch {
      alert('复制失败，请手动长按复制');
    }
  };

  // 点击 Edit 聚焦或切换回编辑
  const handleFocusEdit = () => {
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

      {/* 移动端 H5 容器 (100% 还原真机两张实拍图) */}
      <main className="w-full max-w-[420px] bg-white min-h-screen sm:min-h-[760px] sm:rounded-3xl shadow-sm border-x sm:border border-slate-200/80 p-5 flex flex-col justify-between space-y-4">
        
        <div className="space-y-4">
          
          {/* 1. 顶部 Header 状态栏：✕ | 🔤 全文翻译 > | ··· */}
          <header className="flex items-center justify-between pt-1 pb-1">
            <button
              type="button"
              onClick={() => setViewState(viewState === 'result' ? 'input' : 'result')}
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

          {/* ======================================================== */}
          {/* 状态 A: 初始输入选词页面 (对应图2: media_1787355795204.jpg) */}
          {/* ======================================================== */}
          {viewState === 'input' && (
            <div className="space-y-5 animate-fadeIn">
              
              {/* 语言选择下拉胶囊 (🌐 English ⌵) */}
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
                  className="flex items-center gap-1 bg-white border border-slate-200 shadow-2xs px-3 py-1.5 rounded-full text-xs text-slate-700 font-medium active:scale-95"
                >
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t.langSelect}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>

              {/* 橙色可爱吉祥物头像 🟠 */}
              <div className="flex justify-center pt-1">
                <div className="w-14 h-14 rounded-full bg-[#FF6B35] flex items-center justify-center gap-2 shadow-xs shadow-orange-500/20">
                  <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                </div>
              </div>

              {/* 主标题：Write your review or choose keywords */}
              <h2 className="text-center text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight leading-snug px-4">
                {t.heroTitle}
              </h2>

              {/* 文本输入框：Simple input your experience... */}
              <div className="bg-slate-50/80 rounded-2xl border border-slate-200/90 p-4 focus-within:border-slate-400 focus-within:bg-white transition-all shadow-2xs">
                <textarea
                  value={customExperience}
                  onChange={(e) => setCustomExperience(e.target.value)}
                  placeholder={t.inputPlaceholder}
                  rows={3}
                  className="w-full bg-transparent text-slate-800 text-xs sm:text-sm outline-none resize-none placeholder-slate-400 leading-relaxed font-sans"
                />
              </div>

              {/* 猜你想要关键词区：Guess what you want to say */}
              <div className="space-y-3 pt-1">
                <h3 className="text-xs sm:text-[13px] font-bold text-slate-700">
                  {t.sectionTags}
                </h3>

                {/* 胶囊标签网格 (100% 还原图2排版) */}
                <div className="flex flex-wrap gap-2">
                  {PRESET_TAGS.map((tag) => {
                    const isSelected = selectedTagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => handleTagToggle(tag.id)}
                        className={`min-h-[38px] px-4 py-2 rounded-full text-xs font-medium transition-all select-none flex items-center gap-1 active:scale-95 ${
                          isSelected
                            ? 'bg-amber-50/70 text-[#9A3412] border border-[#FDBA74] shadow-xs font-semibold'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span>{lang === 'zh' ? tag.zh : tag.en}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 生成按钮 */}
              <button
                type="button"
                disabled={isLoading}
                onClick={handleGenerate}
                className="w-full min-h-[48px] py-3.5 px-4 rounded-2xl bg-[#FF3B30] hover:bg-[#E02020] active:bg-[#CC1E1E] text-white font-bold text-sm shadow-md shadow-red-500/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t.btnGenerating}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{t.btnGenerate}</span>
                  </>
                )}
              </button>

            </div>
          )}

          {/* ======================================================== */}
          {/* 状态 B: 生成优化结果页面 (对应图1: media_1787355666567.jpg) */}
          {/* ======================================================== */}
          {viewState === 'result' && (
            <div className="space-y-4 animate-fadeIn">
              
              {/* 绿色完成状态提示：✔ Google Review review has been optimized for you: */}
              <div className="flex items-start gap-1.5 pt-2">
                <span className="text-emerald-500 font-bold text-sm mt-0.5">✔</span>
                <p className="text-emerald-600 font-bold text-xs sm:text-[13px] leading-snug">
                  {t.optSuccess}
                </p>
              </div>

              {/* 核心卡片容器：内嵌可编辑文本与 [✎ Edit] [🔄 Regenerate] 胶囊按钮 */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-4 focus-within:border-slate-300 transition-all">
                
                {/* 可编辑文本域 */}
                <textarea
                  ref={textareaRef}
                  value={generatedReview}
                  onChange={(e) => setGeneratedReview(e.target.value)}
                  placeholder="评价内容将在此呈现..."
                  rows={5}
                  className="w-full bg-transparent text-slate-800 text-[13.5px] sm:text-[14px] leading-relaxed outline-none resize-none overflow-hidden font-sans placeholder-slate-400"
                />

                {/* 卡片内部底部的两个并排操作按钮：[✎ Edit] [🔄 Regenerate] */}
                <div className="flex items-center justify-center gap-3 pt-2 border-t border-slate-100">
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

              {/* 快捷选词标签条（在结果页也可快速点选并重新生成） */}
              <div className="bg-slate-50/60 rounded-xl p-3 border border-slate-200/60 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                  <span>{t.sectionTags}</span>
                  <button
                    type="button"
                    onClick={() => setViewState('input')}
                    className="text-slate-400 hover:text-slate-600 font-normal"
                  >
                    自定义选词 &gt;
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_TAGS.slice(0, 6).map((tag) => {
                    const isSelected = selectedTagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => handleTagToggle(tag.id)}
                        className={`min-h-[32px] px-3 py-1 rounded-full text-[11px] font-medium transition-all flex items-center gap-1 active:scale-95 ${
                          isSelected
                            ? 'bg-amber-50 text-[#9A3412] border border-[#FDBA74] font-semibold'
                            : 'bg-white text-slate-600 border border-slate-200'
                        }`}
                      >
                        <span>{lang === 'zh' ? tag.zh : tag.en}</span>
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 免责声明文本 */}
              <p className="text-[11px] text-slate-400 text-center leading-relaxed pt-1">
                {t.disclaimer}
              </p>

              {/* 醒目的红色主操作按钮：[📋 Copy and publish] */}
              <button
                type="button"
                onClick={handleCopyAndPublish}
                className="w-full min-h-[48px] py-3.5 px-4 rounded-2xl bg-[#FF3B30] hover:bg-[#E02020] active:bg-[#CC1E1E] text-white font-bold text-sm shadow-md shadow-red-500/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <Copy className="w-4 h-4 stroke-[2.5]" />
                <span>{t.btnCopy}</span>
              </button>

              {/* 附加题：企微群工作流折叠抽屉 */}
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
          )}

        </div>

      </main>
    </div>
  );
}
