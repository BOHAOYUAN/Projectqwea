'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Loader2,
  ExternalLink,
  Bot,
  Edit3,
  Plus,
} from 'lucide-react';

const PRESET_TAG_OPTIONS = ['服务好', '出餐快', '环境干净', '饮品颜值高', '口味独特'];

export default function HomePage() {
  // 1. 状态管理
  const [tagsList, setTagsList] = useState<string[]>(PRESET_TAG_OPTIONS);
  const [selectedTags, setSelectedTags] = useState<string[]>(['服务好', '出餐快']);
  const [platform, setPlatform] = useState<'Google' | '小红书'>('小红书');
  const [generatedReview, setGeneratedReview] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showCopyToast, setShowCopyToast] = useState<boolean>(false);

  // 自定义标签输入状态
  const [showCustomInput, setShowCustomInput] = useState<boolean>(false);
  const [customTagText, setCustomTagText] = useState<string>('');

  // 附加题 Webhook 数据与折叠抽屉状态
  const [webhookData, setWebhookData] = useState<{
    summary: string;
    replyDraft: string;
  } | null>(null);
  const [showWebhookDrawer, setShowWebhookDrawer] = useState<boolean>(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 文本框高度随内容自动撑高（去除内部滚动条）
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(120, textareaRef.current.scrollHeight)}px`;
    }
  }, [generatedReview]);

  // 2. 标签点击切换（严格限制：至多只能选择 2 个）
  const handleTagClick = (tag: string) => {
    setErrorMessage('');
    if (selectedTags.includes(tag)) {
      // 取消选中
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      // 最多只能选 2 个
      if (selectedTags.length < 2) {
        setSelectedTags([...selectedTags, tag]);
      }
    }
  };

  // 添加自定义标签
  const handleAddCustomTag = () => {
    const trimmed = customTagText.trim();
    if (!trimmed) return;
    if (tagsList.includes(trimmed)) {
      setErrorMessage('该标签已存在');
      return;
    }
    // 添加到标签列表
    setTagsList([...tagsList, trimmed]);
    // 如果当前选中的少于2个，自动选中新加的自定义标签
    if (selectedTags.length < 2) {
      setSelectedTags([...selectedTags, trimmed]);
    }
    setCustomTagText('');
    setShowCustomInput(false);
    setErrorMessage('');
  };

  // 删除自定义标签
  const handleDeleteCustomTag = (tagToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTagsList(tagsList.filter((t) => t !== tagToDelete));
    setSelectedTags(selectedTags.filter((t) => t !== tagToDelete));
  };

  // 3. AI 生成评价逻辑（包含主生成与换一批）
  const handleGenerate = async (isRefresh = false) => {
    if (selectedTags.length === 0) {
      setErrorMessage('请至少选择 1 个消费感受标签');
      return;
    }

    if (isRefresh) {
      setIsRegenerating(true);
    } else {
      setIsLoading(true);
    }
    setErrorMessage('');

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          tags: selectedTags,
          seed: Date.now() + Math.floor(Math.random() * 10000), // 每次传递随机 seed 确保换一批不重复
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
      setIsRegenerating(false);
    }
  };

  // 4. 一键复制并智能跳转
  const handleCopyAndRedirect = async () => {
    if (!generatedReview.trim()) {
      setErrorMessage('请先点击上方按钮生成评价内容');
      return;
    }

    try {
      // 写入系统剪贴板
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

      // 弹出绿色 Toast 提示 (1.5s 自动消失)
      setShowCopyToast(true);
      setTimeout(() => setShowCopyToast(false), 1500);

      // 智能跳转至对应平台
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
      setErrorMessage('复制失败，请手动长按文本框全选复制');
    }
  };

  // 字数 / 词数计算
  const countDisplay =
    platform === 'Google'
      ? `${generatedReview.trim() ? generatedReview.trim().split(/\s+/).filter(Boolean).length : 0} Words`
      : `${generatedReview.length} 字`;

  return (
    <div className="min-h-screen bg-[#F4F4F5] flex flex-col justify-start sm:justify-center items-center p-4 sm:py-8 font-sans antialiased text-slate-800 selection:bg-amber-500 selection:text-white">
      
      {/* 绿色 Toast 提示 (居中弹窗) */}
      {showCopyToast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white text-xs sm:text-sm font-bold px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2 transition-all animate-bounce">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>✅ 已复制到剪贴板，即将跳转...</span>
        </div>
      )}

      {/* 移动端 H5 卡片容器 (max-width: 420px, 纯白卡片，高对比度，呼吸感留白) */}
      <main className="w-full max-w-[420px] bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 sm:p-7 space-y-6">
        
        {/* Header 品牌区域 */}
        <header className="space-y-1 text-left pb-2 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
              <span>Sunny Tea House</span>
              <span>🧋</span>
            </h1>
            <span className="text-[11px] font-bold bg-amber-50 text-amber-800 px-2.5 py-1 rounded-full border border-amber-200">
              San Jose
            </span>
          </div>
          <p className="text-xs text-slate-500">
            顾客打卡评价助手 · 轻松生成并一键发布
          </p>
        </header>

        {/* 错误提示条 */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl p-3.5 font-medium leading-relaxed animate-fadeIn">
            ⚠️ {errorMessage}
          </div>
        )}

        {/* 步骤 1：感受选择（限选 1-2 项，支持自定义添加 tag） */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 tracking-wide">
              1. 选择消费感受 <span className="text-slate-400 font-normal">(限选 1-2 项)</span>
            </label>
            <span className="text-[11px] font-mono font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
              {selectedTags.length}/2
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {tagsList.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              const isDisabled = !isSelected && selectedTags.length >= 2;
              const isCustom = !PRESET_TAG_OPTIONS.includes(tag);

              return (
                <button
                  key={tag}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleTagClick(tag)}
                  className={`min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-semibold transition-all select-none flex items-center gap-1.5 active:scale-95 ${
                    isSelected
                      ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-500/20'
                      : isDisabled
                      ? 'opacity-40 bg-slate-100 text-slate-400 border border-transparent cursor-not-allowed pointer-events-none'
                      : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{tag}</span>
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  {isCustom && !isDisabled && (
                    <span
                      onClick={(e) => handleDeleteCustomTag(tag, e)}
                      className={`ml-1 text-[10px] rounded-full w-3.5 h-3.5 flex items-center justify-center ${
                        isSelected ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                      }`}
                    >
                      ×
                    </span>
                  )}
                </button>
              );
            })}

            {/* + 自定义标签胶囊按钮 */}
            <button
              type="button"
              onClick={() => setShowCustomInput(!showCustomInput)}
              className="min-h-[44px] px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-50 text-amber-700 border border-dashed border-amber-300 hover:bg-amber-50/60 transition-all flex items-center gap-1 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>自定义</span>
            </button>
          </div>

          {/* 展开的自定义标签输入框 */}
          {showCustomInput && (
            <div className="flex gap-2 pt-1 animate-fadeIn">
              <input
                type="text"
                value={customTagText}
                onChange={(e) => setCustomTagText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCustomTag()}
                placeholder="输入自定义感受（如：珍珠筋道、茶香浓郁）"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-amber-500 focus:bg-white transition-all font-sans"
              />
              <button
                type="button"
                onClick={handleAddCustomTag}
                className="bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-xl active:scale-95"
              >
                添加
              </button>
            </div>
          )}
        </section>

        {/* 步骤 2：平台选择 (Google vs 小红书) */}
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
              className={`min-h-[44px] py-3 px-4 rounded-xl text-xs font-bold transition-all border text-center flex items-center justify-center gap-1.5 ${
                platform === 'Google'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-500/20'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>🌐 Google</span>
              {platform === 'Google' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </button>

            <button
              type="button"
              onClick={() => {
                setPlatform('小红书');
                setErrorMessage('');
              }}
              className={`min-h-[44px] py-3 px-4 rounded-xl text-xs font-bold transition-all border text-center flex items-center justify-center gap-1.5 ${
                platform === '小红书'
                  ? 'bg-rose-500 text-white border-rose-500 shadow-sm ring-2 ring-rose-500/20'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>📕 小红书</span>
              {platform === '小红书' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </button>
          </div>
        </section>

        {/* 步骤 3：AI 智能生成主按钮 */}
        <div>
          <button
            type="button"
            disabled={isLoading || isRegenerating}
            onClick={() => handleGenerate(false)}
            className="w-full min-h-[48px] py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-75 disabled:cursor-not-allowed text-white font-extrabold text-sm shadow-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>⏳ AI正在思考中...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>✨ AI生成评价</span>
              </>
            )}
          </button>
        </div>

        {/* 步骤 4：评价内容预览 (可二次编辑) & 一键复制并跳转 */}
        <section className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 tracking-wide flex items-center gap-1">
              <Edit3 className="w-3.5 h-3.5 text-slate-500" />
              <span>3. 评价内容预览</span>
              <span className="text-slate-400 font-normal text-[11px]">(可二次编辑)</span>
            </label>

            {/* 换一批按钮（支持实时重新生成不同文案，带动画） */}
            <button
              type="button"
              disabled={isLoading || isRegenerating}
              onClick={() => handleGenerate(true)}
              className="text-[11px] font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 px-2.5 py-1.5 rounded-lg transition-all active:scale-95 disabled:opacity-50 min-h-[30px]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin text-amber-600' : 'text-slate-500'}`} />
              <span>{isRegenerating ? '正在换一批...' : '🔄 换一批'}</span>
            </button>
          </div>

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
                {countDisplay}
              </span>
            )}
          </div>

          {/* 一键复制并前往发布按钮 */}
          <button
            type="button"
            disabled={isLoading || isRegenerating || !generatedReview.trim()}
            onClick={handleCopyAndRedirect}
            className="w-full min-h-[44px] py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-black disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>一键复制并前往 {platform} 发布</span>
            <ExternalLink className="w-3 h-3 opacity-70" />
          </button>

          <p className="text-[10px] text-center text-slate-400 pt-0.5">
            点击将自动复制文案并打开对应平台的发布页面
          </p>

          {/* 步骤 5 / 附加题：企业微信工作流折叠抽屉 */}
          {webhookData && (
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowWebhookDrawer(!showWebhookDrawer)}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/90 flex items-center justify-between text-[11px] font-bold transition-all text-slate-700"
              >
                <span className="flex items-center gap-1.5 text-emerald-700">
                  <Bot className="w-3.5 h-3.5" />
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
                <div className="mt-2 p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-2 text-xs animate-fadeIn">
                  <div>
                    <span className="text-emerald-900 font-bold block text-[10px]">
                      📌 AI 核心中文摘要 (20字)：
                    </span>
                    <p className="mt-0.5 text-slate-800 font-semibold text-[11px]">
                      {webhookData.summary}
                    </p>
                  </div>
                  <div className="pt-1.5 border-t border-emerald-100">
                    <span className="text-emerald-900 font-bold block text-[10px]">
                      💬 建议老板感谢回复草稿 (50字)：
                    </span>
                    <p className="mt-1 text-slate-700 bg-white p-2.5 rounded-xl border border-emerald-100 leading-relaxed text-[11px] shadow-2xs">
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
