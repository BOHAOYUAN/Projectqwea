'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  MapPin,
  Flame,
  CheckCircle2,
  Sliders,
  ChevronDown,
  ChevronUp,
  Bot,
  BellRing,
  Award,
  Loader2,
  Edit3,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface TagOption {
  id: string;
  label: string;
  icon: string;
  desc: string;
}

const TAG_OPTIONS: TagOption[] = [
  { id: 'service', label: '服务态度好', icon: '🌟', desc: '热情贴心 · 笑容满分' },
  { id: 'speed', label: '出餐超快', icon: '⚡', desc: '即点即做 · 无需久候' },
  { id: 'vibe', label: '环境干净出片', icon: '🌿', desc: '明亮舒适 · 网红打卡' },
  { id: 'aesthetic', label: '饮品颜值高', icon: '🧋', desc: '分层绝美 · 拍照好看' },
  { id: 'taste', label: '甜度恰到好处', icon: '🍬', desc: '茶香醇厚 · 甜而不腻' },
  { id: 'boba', label: '珍珠Q弹软糯', icon: '😋', desc: '现熬黑糖 · 嚼劲十足' },
];

const SIGNATURE_DRINKS = [
  '黑糖珍珠鲜奶 (Brown Sugar Boba)',
  '杨枝甘露 (Mango Pomelo Sago)',
  '四季春芝士奶盖 (Cheese Foam Oolong)',
  '白桃乌龙鲜果茶 (Peach Oolong Tea)',
  '芋泥波波鲜奶 (Taro Paste Milk)',
];

export default function HomePage() {
  // Core state
  const [selectedTags, setSelectedTags] = useState<string[]>(['service', 'boba']);
  const [platform, setPlatform] = useState<'google' | 'xhs'>('xhs');
  const [selectedDrink, setSelectedDrink] = useState<string>(SIGNATURE_DRINKS[0]);
  const [tone, setTone] = useState<'enthusiastic' | 'chill'>('enthusiastic');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState('');
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Bonus Webhook state
  const [webhookData, setWebhookData] = useState<{
    summary?: string;
    sentiment?: string;
    merchantReply?: string;
    pushStatus?: string;
    time?: string;
  } | null>(null);
  const [showWebhookDrawer, setShowWebhookDrawer] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(130, textareaRef.current.scrollHeight)}px`;
    }
  }, [generatedText]);

  // Toast utility
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Tag toggle handler (max 2)
  const handleTagToggle = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      if (selectedTags.length === 1) {
        showToast('请至少保留 1 个感受标签哦');
        return;
      }
      setSelectedTags(selectedTags.filter((t) => t !== tagId));
    } else {
      if (selectedTags.length >= 2) {
        setSelectedTags([selectedTags[1], tagId]);
      } else {
        setSelectedTags([...selectedTags, tagId]);
      }
    }
  };

  // Core Generation Logic with Streaming
  const handleGenerate = async () => {
    setIsGenerating(true);
    setGeneratedText('');
    setWebhookData(null);

    const tagLabels = selectedTags.map(
      (id) => TAG_OPTIONS.find((t) => t.id === id)?.label || id
    );

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tags: tagLabels,
          platform,
          customDrink: selectedDrink,
          tone,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error('AI 生成请求遇到临时波动');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        setGeneratedText((prev) => prev + chunk);
      }

      // Trigger Bonus Workflow (WeCom Summary & Reply Generation)
      triggerWebhookWorkflow(fullText, tagLabels, platform);
    } catch (err: unknown) {
      console.warn('Generation handled with fallback:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Trigger WeCom automation workflow
  const triggerWebhookWorkflow = async (
    text: string,
    tags: string[],
    plat: string
  ) => {
    if (!text || text.length < 10) return;
    try {
      const res = await fetch('/api/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewText: text,
          platform: plat,
          tags,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setWebhookData({
          ...data,
          time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        });
      }
    } catch (err) {
      console.warn('Webhook auto-trigger error:', err);
    }
  };

  // Robust One-click Copy and Jump Flow (with Clipboard Fallback & App/Web Deep Linking)
  const handleCopyAndJump = async () => {
    if (!generatedText) {
      showToast('请先点击上方按钮生成评价内容！');
      return;
    }

    try {
      // 1. Primary Clipboard API with legacy fallback
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(generatedText);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = generatedText;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }

      setCopied(true);
      setTimeout(() => setCopied(false), 2500);

      // Trigger joyful confetti
      confetti({
        particleCount: 90,
        spread: 65,
        origin: { y: 0.8 },
      });

      showToast('🎉 文案已复制！正在为您打开平台，可直接粘贴发布 ✨');

      // 2. Intelligent Deep Linking with Webpage Fallback
      setTimeout(() => {
        if (platform === 'google') {
          // Open Google Search/Maps web review entrance directly (Reliable on all mobile & desktop)
          window.open(
            'https://www.google.com/maps/search/?api=1&query=Sunny+Tea+House+San+Jose+CA',
            '_blank'
          );
        } else {
          // For Xiaohongshu: Try App Scheme on mobile, fallback safely to Web explore
          const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
          if (isMobile) {
            // Attempt to trigger app scheme
            const schemeTimeout = setTimeout(() => {
              window.open('https://www.xiaohongshu.com/explore', '_blank');
            }, 1500);

            window.location.href = 'xhsdiscover://';

            // Clean timeout if visibility changes (app opened)
            window.addEventListener('pagehide', () => clearTimeout(schemeTimeout), { once: true });
          } else {
            window.open('https://www.xiaohongshu.com/explore', '_blank');
          }
        }
      }, 700);
    } catch {
      showToast('已选中内容，可手动复制粘贴。');
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F3EF] sm:bg-slate-900 flex justify-center selection:bg-amber-500 selection:text-slate-950 font-sans">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-amber-300 border border-amber-500/50 px-5 py-2.5 rounded-full font-bold text-xs sm:text-sm shadow-2xl flex items-center gap-2 animate-bounce backdrop-blur-md">
          <Sparkles className="w-4 h-4 fill-amber-400 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main H5 Container (100% full-width on mobile, max-w-md cleanly centered on PC) */}
      <div className="w-full max-w-md bg-[#FAF8F5] min-h-screen flex flex-col shadow-xl sm:my-6 sm:rounded-3xl sm:border sm:border-slate-300/80 overflow-x-hidden">
        
        {/* H5 Header */}
        <header className="bg-white px-4 py-3.5 border-b border-amber-100/80 shadow-xs sticky top-0 z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center text-xl shadow-md shadow-amber-500/20">
                🧋
              </div>
              <div>
                <h1 className="font-extrabold text-base text-slate-900 flex items-center gap-1.5 leading-tight">
                  Sunny Tea House
                  <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full">
                    SJ
                  </span>
                </h1>
                <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-amber-500" />
                  San Jose, CA · 顾客专属好评助手
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full text-[10px] text-amber-800 font-bold">
              <Flame className="w-3 h-3 fill-amber-500 text-amber-500" />
              <span>Groq 极速</span>
            </div>
          </div>
        </header>

        {/* H5 Main Body */}
        <main className="p-4 space-y-3.5 flex-1 pb-8">
          
          {/* Step 1: 感受标签选择 */}
          <section className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center font-black">
                  1
                </span>
                <span className="font-bold text-xs text-slate-900 uppercase tracking-wide">
                  本次消费感受 (选 1-2 项)
                </span>
              </div>
              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/80">
                已选 {selectedTags.length}/2
              </span>
            </div>

            {/* 2-Column Responsive Tags */}
            <div className="grid grid-cols-2 gap-2">
              {TAG_OPTIONS.map((tag) => {
                const isSelected = selectedTags.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleTagToggle(tag.id)}
                    className={`flex items-start gap-2 p-2.5 rounded-xl border text-left transition-all active:scale-95 ${
                      isSelected
                        ? 'bg-amber-50/90 border-amber-500 text-amber-950 shadow-xs ring-1 ring-amber-500/30'
                        : 'bg-slate-50 border-slate-200/90 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-xl mt-0.5">{tag.icon}</span>
                    <div className="flex flex-col min-w-0">
                      <span className={`text-xs font-bold truncate ${isSelected ? 'text-amber-950' : 'text-slate-800'}`}>
                        {tag.label}
                      </span>
                      <span className="text-[10px] text-slate-400 leading-tight mt-0.5 truncate">
                        {tag.desc}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Step 2: 目标平台选择 */}
          <section className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 shadow-xs space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center font-black">
                2
              </span>
              <span className="font-bold text-xs text-slate-900 uppercase tracking-wide">
                选择希望发布的目标平台
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Google Card */}
              <button
                type="button"
                onClick={() => setPlatform('google')}
                className={`p-3 rounded-xl border flex flex-col gap-1 text-left transition-all ${
                  platform === 'google'
                    ? 'bg-blue-50/90 border-blue-500 text-blue-950 shadow-xs ring-2 ring-blue-500/20'
                    : 'bg-slate-50 border-slate-200/90 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">🌐</span>
                    <span className="font-black text-xs text-slate-900">Google</span>
                  </div>
                  {platform === 'google' && (
                    <CheckCircle2 className="w-4 h-4 text-blue-600 fill-blue-100" />
                  )}
                </div>
                <p className="text-[10px] text-slate-500 leading-snug">
                  地道北美英文口吻
                </p>
              </button>

              {/* Xiaohongshu Card */}
              <button
                type="button"
                onClick={() => setPlatform('xhs')}
                className={`p-3 rounded-xl border flex flex-col gap-1 text-left transition-all ${
                  platform === 'xhs'
                    ? 'bg-rose-50/90 border-rose-500 text-rose-950 shadow-xs ring-2 ring-rose-500/20'
                    : 'bg-slate-50 border-slate-200/90 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">📕</span>
                    <span className="font-black text-xs text-slate-900">小红书</span>
                  </div>
                  {platform === 'xhs' && (
                    <CheckCircle2 className="w-4 h-4 text-rose-600 fill-rose-100" />
                  )}
                </div>
                <p className="text-[10px] text-slate-500 leading-snug">
                  爆款种草 · Emoji 排版
                </p>
              </button>
            </div>
          </section>

          {/* Optional Drink Select Accordion */}
          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full px-4 py-2.5 flex items-center justify-between text-xs text-slate-500 hover:text-slate-800 transition-colors"
            >
              <span className="flex items-center gap-2 font-medium">
                <Sliders className="w-3.5 h-3.5 text-amber-500" />
                <span>点单饮品设定 (选填)</span>
              </span>
              {showAdvanced ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>

            {showAdvanced && (
              <div className="p-3.5 pt-1 border-t border-slate-100 bg-slate-50/50 space-y-2">
                <label className="text-[11px] text-slate-500 block font-medium">
                  选择喝到的饮品：
                </label>
                <select
                  value={selectedDrink}
                  onChange={(e) => setSelectedDrink(e.target.value)}
                  className="w-full bg-white border border-slate-300 text-slate-800 text-xs rounded-xl px-3 py-2 outline-none focus:border-amber-500 font-sans shadow-xs"
                >
                  {SIGNATURE_DRINKS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Step 3: Action Trigger Button with Loading Animation */}
          <div>
            <button
              type="button"
              disabled={isGenerating}
              onClick={handleGenerate}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-sm shadow-md shadow-amber-500/25 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>✨ AI 正在为您构思地道文案...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 fill-white" />
                  <span>{generatedText ? '🔄 换一批，重新生成' : '✨ 一键生成专属好评'}</span>
                </>
              )}
            </button>
          </div>

          {/* Step 4: Social Card Output & Editable Box */}
          {(generatedText || isGenerating) && (
            <section className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/90 shadow-md space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center font-black">
                    3
                  </span>
                  <span className="font-bold text-xs text-slate-900 uppercase tracking-wide">
                    {platform === 'google' ? 'Google 评论预览' : '小红书笔记预览'}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                  <Edit3 className="w-3 h-3 text-amber-500" />
                  <span>{generatedText.length} 字 (点击直接编辑)</span>
                </div>
              </div>

              {/* Social Card Box with Clear Focus/Editable Border */}
              <div
                className={`rounded-2xl p-3.5 border text-xs leading-relaxed transition-all focus-within:ring-2 ${
                  platform === 'google'
                    ? 'bg-blue-50/40 border-blue-200 focus-within:ring-blue-500/30 focus-within:border-blue-400'
                    : 'bg-rose-50/40 border-rose-200 focus-within:ring-rose-500/30 focus-within:border-rose-400'
                }`}
              >
                {/* User Header */}
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200/80 mb-2">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                      platform === 'google'
                        ? 'bg-blue-600 text-white'
                        : 'bg-rose-500 text-white'
                    }`}
                  >
                    {platform === 'google' ? 'G' : 'RED'}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-xs flex items-center gap-1">
                      <span>{platform === 'google' ? 'Alex M. (Local Guide)' : '湾区甜妹探店日记'}</span>
                      {platform === 'google' && (
                        <span className="text-[9px] bg-blue-100 text-blue-700 px-1 rounded font-mono">
                          Lv 6
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Editable Textarea with Natural Line Breaks & Focus Ring */}
                <textarea
                  ref={textareaRef}
                  value={generatedText}
                  onChange={(e) => setGeneratedText(e.target.value)}
                  placeholder="AI 生成文案将在此实时呈现..."
                  rows={5}
                  className="w-full bg-transparent text-slate-800 text-xs sm:text-[13px] leading-relaxed outline-none resize-none placeholder-slate-400 font-sans cursor-text"
                />

                {isGenerating && (
                  <span className="inline-block w-1.5 h-3.5 bg-amber-500 animate-pulse align-middle ml-1" />
                )}
              </div>

              {/* Publish / Copy Jump Button */}
              <button
                type="button"
                onClick={handleCopyAndJump}
                className={`w-full py-3.5 px-4 rounded-2xl font-extrabold text-sm shadow-md flex items-center justify-center gap-2 active:scale-[0.98] transition-all text-white ${
                  platform === 'google'
                    ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/25'
                    : 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/25'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>已复制！正在跳转发布入口...</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>一键复制并前往 {platform === 'google' ? 'Google' : '小红书'} 发布</span>
                    <ExternalLink className="w-4 h-4 opacity-80" />
                  </>
                )}
              </button>

              <p className="text-[10px] text-center text-slate-400">
                💡 自动复制到剪贴板，并智能打开对应 App / 网页发布入口
              </p>
            </section>
          )}

          {/* Bonus Question Accordion (Automated Enterprise WeChat Sync) */}
          {webhookData && (
            <section className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs text-xs animate-fadeIn">
              <button
                type="button"
                onClick={() => setShowWebhookDrawer(!showWebhookDrawer)}
                className="w-full px-4 py-3 flex items-center justify-between text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-bold text-xs text-slate-800">
                    附加题：企业微信群机器人工作流 (已自动触发)
                  </span>
                </div>
                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                  {showWebhookDrawer ? '收起' : '查看摘要与回复'}
                </span>
              </button>

              {showWebhookDrawer && (
                <div className="p-4 pt-1 border-t border-slate-100 bg-slate-50/70 space-y-2.5">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pb-1 border-b border-slate-200">
                    <span>📡 Webhook 数据装配状态：<strong className="text-emerald-600">已就绪并模拟分发</strong></span>
                    <span className="font-mono">{webhookData.time}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">📌 AI 提炼中文摘要：</span>
                    <p className="text-slate-800 font-semibold mt-0.5">{webhookData.summary}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">💬 建议商家回复草稿 (店长回复)：</span>
                    <div className="bg-white border border-slate-200 rounded-xl p-2.5 text-slate-700 mt-0.5 leading-relaxed text-[11px] shadow-xs">
                      {webhookData.merchantReply}
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

        </main>

        {/* H5 Footer */}
        <footer className="p-3.5 text-center bg-white border-t border-slate-100 text-[10px] text-slate-400 space-y-1">
          <div>Sunny Tea House · Powered by Groq LPU & Next.js Serverless</div>
          <div>
            <a
              href="/PROJECT_DOCUMENTATION.html"
              target="_blank"
              className="text-amber-600 underline font-medium hover:text-amber-700 inline-flex items-center gap-1"
            >
              <span>查看项目技术与设计文档 (PDF)</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </footer>

      </div>
    </div>
  );
}
