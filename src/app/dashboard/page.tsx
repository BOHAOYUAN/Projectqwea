'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  BarChart3,
  BrainCircuit,
  FileSpreadsheet,
  Download,
  ArrowLeft,
  Star,
  CheckCircle2,
  TrendingUp,
  Store,
  Filter,
  Loader2,
} from 'lucide-react';

interface ReviewItem {
  id: number;
  date: string;
  customerName: string;
  platform: 'Google' | '小红书';
  rating: number;
  tags: string[];
  text: string;
  summary?: string;
  reply?: string;
}

const INITIAL_REVIEWS: ReviewItem[] = [
  {
    id: 1,
    date: '2026-08-28',
    customerName: 'Emily R.',
    platform: 'Google',
    rating: 5,
    tags: ['服务好', '出餐快'],
    text: 'Sunny Tea House is hands down my favorite boba spot in San Jose! Super fast service and the crew is always so welcoming. The boba was chewy and fresh!',
    summary: '顾客对快速出餐与店员热情服务给予高度赞赏。',
    reply: 'Thank you Emily! We are thrilled you enjoyed the fresh boba. Looking forward to serving you again soon!',
  },
  {
    id: 2,
    date: '2026-08-28',
    customerName: '湾区小甜心',
    platform: '小红书',
    rating: 5,
    tags: ['饮品颜值高', '口味独特'],
    text: '🧋在San Jose挖到宝藏奶茶啦！杨枝甘露拍照巨出片，少糖配比超级绝，奶香浓郁清爽不腻～必须安利给所有姐妹！',
    summary: '顾客重点好评了杨枝甘露的颜值与清爽口感。',
    reply: '感谢宝子的打卡安利！我们会继续保持高颜值与高品质茶底，期待下次再来哦～',
  },
  {
    id: 3,
    date: '2026-08-27',
    customerName: 'Michael Chen',
    platform: 'Google',
    rating: 5,
    tags: ['环境干净', '口味独特'],
    text: 'Really clean store and great modern vibe. Ordered the Roasted Oolong Milk Tea at 50% sugar. Perfect tea aroma and boba consistency.',
    summary: '顾客赞赏了烘焙乌龙茶香与整洁现代的就餐环境。',
    reply: 'Thanks Michael! We take pride in sourcing authentic tea leaves. See you next time!',
  },
  {
    id: 4,
    date: '2026-08-27',
    customerName: '硅谷打工人',
    platform: '小红书',
    rating: 4,
    tags: ['出餐快', '服务好'],
    text: '下午茶点单不到3分钟就拿到了，出餐速度感人！店员小哥态度超好，拯救了社畜的一天～',
    summary: '顾客对3分钟极速出餐与贴心服务表示满意。',
    reply: '能为打工人的下午茶充能是我们的荣幸！祝工作顺利，天天好心情！',
  },
  {
    id: 5,
    date: '2026-08-26',
    customerName: 'Sarah L.',
    platform: 'Google',
    rating: 5,
    tags: ['饮品颜值高', '服务好'],
    text: 'The drink presentation is gorgeous! Tried their signature fruit tea, colorful and full of fresh mango and passionfruit. 10/10.',
    summary: '顾客对招牌水果茶的新鲜用料与高颜值给予满分好评。',
    reply: 'Thank you Sarah! Fresh fruits and high quality ingredients are our priority. Glad you loved it!',
  },
  {
    id: 6,
    date: '2026-08-25',
    customerName: '圣何塞探店阿猫',
    platform: '小红书',
    rating: 5,
    tags: ['环境干净', '饮品颜值高'],
    text: '店面装修超级干净明亮，原木风太戳我了！拍了二十分钟照片根本停不下来，奶茶不仅好看还超好喝✨',
    summary: '顾客喜爱原木风极简装修，打卡拍照体验极佳。',
    reply: '感谢精美返图！Sunny Tea House 永远是大家在湾区最治愈的打卡聚集地～',
  },
];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'analytics' | 'diagnosis' | 'batch'>('analytics');
  const [platformFilter, setPlatformFilter] = useState<'全部' | 'Google' | '小红书'>('全部');
  const [isDiagnosing, setIsDiagnosing] = useState<boolean>(false);
  const [diagnosisReport, setDiagnosisReport] = useState<string>('');
  const [isProcessingBatch, setIsProcessingBatch] = useState<boolean>(false);
  const [reviewsList, setReviewsList] = useState<ReviewItem[]>(INITIAL_REVIEWS);

  // 筛选逻辑
  const filteredReviews = reviewsList.filter((r) => {
    if (platformFilter === '全部') return true;
    return r.platform === platformFilter;
  });

  // 执行 AI 商业诊断
  const handleGenerateDiagnosis = async () => {
    setIsDiagnosing(true);
    try {
      const res = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviews: filteredReviews.map((r) => ({
            platform: r.platform,
            rating: r.rating,
            text: r.text,
          })),
        }),
      });
      const data = await res.json();
      if (data.success && data.report) {
        setDiagnosisReport(data.report);
      } else {
        setDiagnosisReport('暂未获取到分析报告，请重试。');
      }
    } catch {
      setDiagnosisReport('网络请求异常，请检查后重试。');
    } finally {
      setIsDiagnosing(false);
    }
  };

  // 批量生成流水线
  const handleRunBatchPipeline = () => {
    setIsProcessingBatch(true);
    setTimeout(() => {
      const updated = reviewsList.map((item) => ({
        ...item,
        summary: item.summary || '顾客对饮品品质与出餐效率表示认可。',
        reply: item.reply || '感谢您的支持与喜爱，期待您的再次光临！',
      }));
      setReviewsList(updated);
      setIsProcessingBatch(false);
    }, 1000);
  };

  // 导出 CSV 报表
  const handleExportCSV = () => {
    const headers = 'ID,Date,Platform,Rating,Customer,ReviewText,AISummary,AIReply\n';
    const rows = filteredReviews
      .map(
        (r) =>
          `${r.id},"${r.date}","${r.platform}",${r.rating},"${r.customerName}","${r.text.replace(/"/g, '""')}","${r.summary || ''}","${r.reply || ''}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Sunny_Tea_House_Analytics_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans antialiased p-4 sm:p-8">
      {/* 顶部导航 Header */}
      <header className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-xl transition-all shadow-2xs active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>返回顾客 H5 评价</span>
            </Link>
            <span className="text-[11px] bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full font-bold">
              San Jose 旗舰店
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-2 flex items-center gap-2">
            <span>Sunny Tea House 🧋</span>
            <span className="text-slate-400 font-normal text-sm sm:text-base">| AI 商业智能与评论分析中台</span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl transition-all shadow-sm active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>导出全店报表 (CSV)</span>
          </button>
        </div>
      </header>

      {/* 主工作区 */}
      <main className="max-w-6xl mx-auto space-y-6 pt-6">
        {/* 4 大核心指标 KPI 卡片 */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
              <span>监控评价总量</span>
              <Store className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900">30 条</div>
            <div className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>+12 本周新增打卡</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
              <span>综合平均星级</span>
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-500">4.86 ★</div>
            <div className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>+0.15 环比上月提升</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
              <span>顾客好评率 (4-5★)</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600">96.7%</div>
            <div className="text-[11px] font-semibold text-slate-500">优于全湾区 94% 同行</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
              <span>AI 自动化处理率</span>
              <Sparkles className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-blue-600">100%</div>
            <div className="text-[11px] font-semibold text-slate-500">平均推理延迟 280ms</div>
          </div>
        </section>

        {/* 选项卡 Tab 切换 */}
        <section className="bg-white p-2 rounded-2xl border border-slate-200 flex items-center gap-2 max-w-md">
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'analytics'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>数据大屏</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('diagnosis')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'diagnosis'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BrainCircuit className="w-3.5 h-3.5" />
            <span>AI 商业诊断</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('batch')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'batch'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>批量回复流水线</span>
          </button>
        </section>

        {/* Tab 1: 动态数据大屏 */}
        {activeTab === 'analytics' && (
          <div className="space-y-6 animate-fadeIn">
            {/* 图表卡片网格 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 消费感受标签分布 */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                  <span>🏷️ 消费感受标签占比</span>
                </h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span>出餐快 ⚡</span>
                      <span className="text-amber-600 font-mono">38%</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: '38%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span>饮品颜值高 📸</span>
                      <span className="text-rose-500 font-mono">28%</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500 rounded-full" style={{ width: '28%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span>口味独特 🧋</span>
                      <span className="text-blue-500 font-mono">20%</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: '20%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span>服务好 / 环境干净 ✨</span>
                      <span className="text-emerald-500 font-mono">14%</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: '14%' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* 渠道分布与星级 */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                  <span>🌐 全渠道打卡与评分对比</span>
                </h3>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-100 text-center space-y-1">
                    <span className="text-xs font-bold text-blue-800">Google Review</span>
                    <div className="text-2xl font-black text-blue-900">4.82 ★</div>
                    <span className="text-[11px] text-blue-600 font-medium">16 条客观英文</span>
                  </div>

                  <div className="bg-rose-50/60 p-4 rounded-2xl border border-rose-100 text-center space-y-1">
                    <span className="text-xs font-bold text-rose-800">小红书种草</span>
                    <div className="text-2xl font-black text-rose-900">4.91 ★</div>
                    <span className="text-[11px] text-rose-600 font-medium">14 条爆款图文</span>
                  </div>
                </div>
              </div>

              {/* 高频词云特征 */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-3">
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                  <span>💬 顾客高频好评关键词</span>
                </h3>
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="text-xs font-bold bg-amber-500 text-white px-3 py-1.5 rounded-xl">
                    出餐巨快 (38)
                  </span>
                  <span className="text-xs font-bold bg-slate-900 text-white px-3 py-1.5 rounded-xl">
                    Chewy Boba (29)
                  </span>
                  <span className="text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-xl">
                    杨枝甘露拍照出片 (24)
                  </span>
                  <span className="text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-xl">
                    Authentic Tea (19)
                  </span>
                  <span className="text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-xl">
                    店员甜美热情 (16)
                  </span>
                  <span className="text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1.5 rounded-xl">
                    原木风超干净 (14)
                  </span>
                </div>
              </div>
            </div>

            {/* 评价列表与平台筛选 */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <span>实时评价流监控</span>
                  <span className="text-xs font-mono font-normal text-slate-400">({filteredReviews.length} 条)</span>
                </h3>

                <div className="flex items-center gap-2">
                  {(['全部', 'Google', '小红书'] as const).map((plat) => (
                    <button
                      key={plat}
                      type="button"
                      onClick={() => setPlatformFilter(plat)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${
                        platformFilter === plat
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {plat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {filteredReviews.map((r) => (
                  <div key={r.id} className="py-3.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{r.customerName}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            r.platform === 'Google'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {r.platform}
                        </span>
                        <span className="text-amber-500 font-bold text-xs">{'★'.repeat(r.rating)}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">{r.date}</span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed font-sans">{r.text}</p>
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {r.tags.map((t) => (
                        <span key={t} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: AI 商业智能诊断 */}
        {activeTab === 'diagnosis' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <BrainCircuit className="w-5 h-5 text-amber-500" />
                    <span>AI 商业智能深度诊断 Copilot</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    基于 Groq LPU 极速算力，毫秒级扫描当前全渠道真实评价语料，输出战略级经营洞察。
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isDiagnosing}
                  onClick={handleGenerateDiagnosis}
                  className="min-h-[44px] px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-50 text-white font-extrabold text-xs shadow-sm transition-all flex items-center gap-2 active:scale-95"
                >
                  {isDiagnosing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>正在深度推理中...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>✨ 一键生成全店 AI 商业诊断报告</span>
                    </>
                  )}
                </button>
              </div>

              {diagnosisReport ? (
                <div className="mt-4 p-6 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-800 leading-relaxed space-y-3 whitespace-pre-line font-sans shadow-inner">
                  {diagnosisReport}
                </div>
              ) : (
                <div className="p-12 text-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                  <BrainCircuit className="w-8 h-8 mx-auto opacity-40 text-amber-600" />
                  <p className="text-xs font-semibold">点击上方按钮，AI 顾问将基于当前 30 条真实评价数据输出完整分析报告</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: 批量处理流水线 */}
        {activeTab === 'batch' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                    <span>批量 AI 摘要与老板回复流水线</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    一键对所有评价生成 20 字中文核心摘要与 50 字老板亲切感谢回复。
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isProcessingBatch}
                    onClick={handleRunBatchPipeline}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
                  >
                    {isProcessingBatch ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>正在批量推理...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>🚀 启动批量 AI 生成</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>导出报表</span>
                  </button>
                </div>
              </div>

              {/* 结果数据表 */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold">
                      <th className="p-3">平台</th>
                      <th className="p-3">顾客与评分</th>
                      <th className="p-3">原始评价</th>
                      <th className="p-3 w-48">📌 AI 核心摘要 (20字)</th>
                      <th className="p-3 w-64">💬 建议老板回复草稿 (50字)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredReviews.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-bold text-slate-700">{r.platform}</td>
                        <td className="p-3">
                          <span className="font-semibold text-slate-900 block">{r.customerName}</span>
                          <span className="text-amber-500 font-bold text-[10px]">{'★'.repeat(r.rating)}</span>
                        </td>
                        <td className="p-3 text-slate-600 max-w-xs">{r.text}</td>
                        <td className="p-3 font-semibold text-emerald-800 bg-emerald-50/40 rounded-xl m-1">
                          {r.summary || '待生成'}
                        </td>
                        <td className="p-3 text-slate-700 bg-slate-50 rounded-xl m-1 text-[11px] leading-relaxed">
                          {r.reply || '待生成'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-8 text-center text-xs text-slate-400 max-w-6xl mx-auto">
        Sunny Tea House 商业智能中台 · Powered by Next.js App Router & Groq LPU
      </footer>
    </div>
  );
}
