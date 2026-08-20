'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Check } from 'lucide-react';

const TAG_OPTIONS = ['服务好', '出餐快', '环境干净', '饮品颜值高', '口味独特'];

export default function HomePage() {
  // 1. React States
  const [selectedTags, setSelectedTags] = useState<string[]>(['服务好', '出餐快']);
  const [platform, setPlatform] = useState<'Google' | '小红书'>('小红书');
  const [generatedReview, setGeneratedReview] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showCopyToast, setShowCopyToast] = useState<boolean>(false);

  // Bonus Webhook UI state (collapsible & unobtrusive)
  const [webhookData, setWebhookData] = useState<{
    summary: string;
    replyDraft: string;
  } | null>(null);
  const [showWebhookDrawer, setShowWebhookDrawer] = useState<boolean>(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea to remove internal scrollbars and provide breathing room
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(120, textareaRef.current.scrollHeight)}px`;
    }
  }, [generatedReview]);

  // 2. Tag Selection Handler (Max 2, unselected disabled)
  const handleTagClick = (tag: string) => {
    setErrorMessage('');
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      if (selectedTags.length < 2) {
        setSelectedTags([...selectedTags, tag]);
      }
    }
  };

  // 3. AI Generation Handler with Loading State
  const handleGenerate = async () => {
    if (selectedTags.length === 0) {
      setErrorMessage('请至少选择 1 个消费感受标签');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setGeneratedReview('');
    setWebhookData(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          tags: selectedTags,
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

  // 4. One-Click Copy & Smart Redirect Handler
  const handleCopyAndRedirect = async () => {
    if (!generatedReview.trim()) {
      setErrorMessage('请先点击上方按钮生成评价内容');
      return;
    }

    try {
      // Copy to clipboard
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

      // Green Toast notification (1.5s auto dismiss)
      setShowCopyToast(true);
      setTimeout(() => setShowCopyToast(false), 1500);

      // Attempt redirect to platform
      setTimeout(() => {
        if (platform === 'Google') {
          window.open(
            'https://www.google.com/maps/search/?api=1&query=Sunny+Tea+House+San+Jose+CA',
            '_blank'
          );
        } else {
          // Xiaohongshu official search result page
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
      setErrorMessage('复制失败，请手动长按文本框全选复制');
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F4F5] flex flex-col justify-start sm:justify-center items-center p-4 sm:py-8 font-sans antialiased text-slate-800">
      
      {/* Green Toast Notification (1.5s Auto Dismiss) */}
      {showCopyToast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white text-xs sm:text-sm font-bold px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2 transition-all animate-bounce">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>✅ 已复制到剪贴板，即将跳转...</span>
        </div>
      )}

      {/* Mobile Card Container (max-width: 420px, centered layout, pure white card) */}
      <main className="w-full max-w-[420px] bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 sm:p-7 space-y-6">
        
        {/* Header Branding (Ample Whitespace & High Contrast) */}
        <header className="space-y-1 text-left pb-2 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Sunny Tea House 🧋
            </h1>
            <span className="text-[11px] font-bold bg-amber-50 text-amber-800 px-2.5 py-1 rounded-full border border-amber-200">
              San Jose
            </span>
          </div>
          <p className="text-xs text-slate-500">
            顾客打卡评价助手 · 轻松生成并一键发布
          </p>
        </header>

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl p-3.5 font-medium leading-relaxed">
            ⚠️ {errorMessage}
          </div>
        )}

        {/* Step 1: 感受选择 (Max 2, others disabled with opacity-40 and not-allowed) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 tracking-wide">
              1. 选择消费感受 <span className="text-slate-400 font-normal">(限选 1-2 项)</span>
            </label>
            <span className="text-[11px] font-mono font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
              {selectedTags.length}/2
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {TAG_OPTIONS.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              const isDisabled = !isSelected && selectedTags.length >= 2;

              return (
                <button
                  key={tag}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleTagClick(tag)}
                  className={`min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-semibold transition-all select-none ${
                    isSelected
                      ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-500/20'
                      : isDisabled
                      ? 'opacity-40 bg-slate-100 text-slate-400 border border-transparent cursor-not-allowed pointer-events-none'
                      : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 active:scale-95'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </section>

        {/* Step 2: 平台切换 (Google vs 小红书) */}
        <section className="space-y-3">
          <label className="text-xs font-bold text-slate-800 tracking-wide block">
            2. 选择发布目标平台
          </label>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setPlatform('Google');
                setErrorMessage('');
              }}
              className={`min-h-[44px] py-3 px-4 rounded-xl text-xs font-bold transition-all border text-center ${
                platform === 'Google'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              🌐 Google
            </button>

            <button
              type="button"
              onClick={() => {
                setPlatform('小红书');
                setErrorMessage('');
              }}
              className={`min-h-[44px] py-3 px-4 rounded-xl text-xs font-bold transition-all border text-center ${
                platform === '小红书'
                  ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              📕 小红书
            </button>
          </div>
        </section>

        {/* Step 3: AI 生成按钮 (Loading spinner & disabled state) */}
        <div>
          <button
            type="button"
            disabled={isLoading}
            onClick={handleGenerate}
            className="w-full min-h-[48px] py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-75 disabled:cursor-not-allowed text-white font-extrabold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>⏳ AI正在思考中...</span>
              </>
            ) : (
              <span>✨ AI生成评价</span>
            )}
          </button>
        </div>

        {/* Step 4: 文本编辑框 (Auto-expanding, no scrollbars) & 一键复制流转 */}
        <section className="space-y-3 pt-2">
          <label className="text-xs font-bold text-slate-800 tracking-wide block">
            3. 评价内容预览 <span className="text-slate-400 font-normal">(可二次编辑)</span>
          </label>

          <div className="relative">
            <textarea
              ref={textareaRef}
              value={generatedReview}
              onChange={(e) => setGeneratedReview(e.target.value)}
              placeholder="点击上方按钮后，AI 生成的评价将呈现于此，您可随时修改..."
              rows={4}
              className="w-full p-4 pb-7 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-xs sm:text-sm leading-relaxed outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20 transition-all resize-none overflow-hidden placeholder-slate-400 font-sans"
            />
            {generatedReview && (
              <span className="absolute bottom-2.5 right-3 text-[10px] text-slate-400 font-mono select-none">
                {platform === 'Google'
                  ? `${generatedReview.trim() ? generatedReview.trim().split(/\s+/).filter(Boolean).length : 0} Words`
                  : `${generatedReview.length} 字`}
              </span>
            )}
          </div>

          {/* 一键复制并跳转按钮 */}
          <button
            type="button"
            disabled={isLoading || !generatedReview.trim()}
            onClick={handleCopyAndRedirect}
            className="w-full min-h-[44px] py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-black disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <span>📋 一键复制并前往 {platform} 发布</span>
          </button>

          <p className="text-[10px] text-center text-slate-400 pt-1">
            点击将自动复制文案并打开对应平台的发布页面
          </p>

          {/* 附加题：企业微信工作流折叠抽屉 (优雅克制，不破坏主视觉) */}
          {webhookData && (
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowWebhookDrawer(!showWebhookDrawer)}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/90 flex items-center justify-between text-[11px] font-bold transition-all text-slate-700"
              >
                <span className="flex items-center gap-1.5 text-emerald-700">
                  <span>🤖 附加题：企微群工作流</span>
                  <span className="bg-emerald-100 text-emerald-800 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold">
                    已就绪
                  </span>
                </span>
                <span className="text-slate-400 text-[10px] font-normal">
                  {showWebhookDrawer ? '收起 ▲' : '查看 AI摘要与回复草稿 ▼'}
                </span>
              </button>

              {showWebhookDrawer && (
                <div className="mt-2 p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-2.5 text-xs animate-fadeIn">
                  <div>
                    <span className="text-emerald-900 font-bold block text-[10px]">
                      📌 AI 核心中文摘要 (20字)：
                    </span>
                    <p className="mt-0.5 text-slate-800 font-semibold text-[11px]">
                      {webhookData.summary}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-emerald-100">
                    <span className="text-emerald-900 font-bold block text-[10px]">
                      💬 建议老板感谢回复草稿 (50字)：
                    </span>
                    <p className="mt-1 text-slate-700 bg-white p-2.5 rounded-xl border border-emerald-100 leading-relaxed text-[11px] shadow-xs">
                      {webhookData.replyDraft}
                    </p>
                  </div>
                  <div className="text-[9px] text-emerald-600/90 flex items-center justify-between pt-1 border-t border-emerald-100/60 font-mono">
                    <span>📡 Webhook: 数据已组装并模拟分发</span>
                    <span className="font-bold">HTTP 200 OK</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

      </main>

      {/* Footer */}
      <footer className="mt-6 text-center text-[11px] text-slate-400">
        Sunny Tea House · Powered by Next.js & Serverless AI
      </footer>

    </div>
  );
}
