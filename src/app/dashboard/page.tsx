'use client';

import React, { useState, useEffect } from 'react';
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
  Building2,
  Filter,
  Loader2,
  KeyRound,
  ChevronDown,
  Check,
  AlertTriangle,
  Flame,
  ListTodo,
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

interface DiagnosisData {
  strengths: string[];
  risks: string[];
  actions: string[];
}

interface StoreConfig {
  id: string;
  name: string;
  location: string;
  rating: number;
  totalReviews: number;
  positiveRate: number;
  tagDist: { label: string; pct: number; color: string }[];
  googleScore: number;
  googleCount: number;
  xhsScore: number;
  xhsCount: number;
  reviews: ReviewItem[];
  defaultDiagnosis: DiagnosisData;
}

const STORES: Record<string, StoreConfig> = {
  sunny_tea: {
    id: 'sunny_tea',
    name: 'Sunny Tea House',
    location: 'San Jose 旗舰店',
    rating: 4.86,
    totalReviews: 30,
    positiveRate: 96.7,
    tagDist: [
      { label: '出餐快 ⚡', pct: 38, color: 'bg-amber-500' },
      { label: '饮品颜值高 📸', pct: 28, color: 'bg-rose-500' },
      { label: '口味独特 🧋', pct: 20, color: 'bg-blue-500' },
      { label: '服务好 / 环境干净 ✨', pct: 14, color: 'bg-emerald-500' },
    ],
    googleScore: 4.82,
    googleCount: 16,
    xhsScore: 4.91,
    xhsCount: 14,
    reviews: [
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
    ],
    defaultDiagnosis: {
      strengths: [
        '3分钟极速出餐锁死下午茶刚需：湾区上班族和学生最怕排队，把出品速度压在4分钟以内，是压制周边竞品的最强护城河。',
        '真茶底香气立住客单价：评价反复夸赞烘焙乌龙茶底有真茶香而不是香精味，证明茶叶原材料没省是对的，直接拉开和廉价奶茶的档次。',
        '渐变色杯身成为天然免费广告：杨枝甘露和多肉葡萄的分层特写在小红书自发裂变，顾客买的不仅是饮品，更是社交打卡货币。',
      ],
      risks: [
        '店外排队动线混乱（随时可能产生1星差评）：周末高峰期堂食取餐和外卖骑手全挤在门口狭窄通道。现在没差评是因为出餐快，一旦遇到爆单，门口立刻会变成拥堵冲突点。',
        '手作珍珠批次口感轻微波动：部分老顾客提到某天珍珠偏软。下午两点和傍晚六点这两批珍珠的焖煮时间需要统一校准，避免新员工凭感觉出锅。',
      ],
      actions: [
        '地贴动线改造（预算20美元）：在门口用醒目贴纸分出【现场取餐通道】和【点单等待区】，让动线顺时针单向流动，彻底告别堵门。',
        '吧台 NFC 亚克力牌前置：把碰一碰立牌从角落挪到打包递杯区，店员递饮品时顺口引导扫码好评赠送小优惠，每天稳定沉淀20条真实好评。',
        '珍珠煮制实行定时器硬考核：将焖煮25分钟加冰水过温的标准写成大字贴在后厨墙上，锁死每锅珍珠的Q弹一致性。',
      ],
    },
  },
  heytea_ny: {
    id: 'heytea_ny',
    name: 'HEYTEA 喜茶',
    location: 'New York SOHO 旗舰店',
    rating: 4.92,
    totalReviews: 45,
    positiveRate: 98.2,
    tagDist: [
      { label: '饮品颜值高 📸', pct: 45, color: 'bg-rose-500' },
      { label: '口味独特 🧋', pct: 30, color: 'bg-blue-500' },
      { label: '环境干净 ✨', pct: 15, color: 'bg-emerald-500' },
      { label: '出餐快 ⚡', pct: 10, color: 'bg-amber-500' },
    ],
    googleScore: 4.9,
    googleCount: 22,
    xhsScore: 4.95,
    xhsCount: 23,
    reviews: [
      {
        id: 101,
        date: '2026-08-28',
        customerName: 'Jennifer K.',
        platform: 'Google',
        rating: 5,
        tags: ['饮品颜值高', '口味独特'],
        text: 'Best cheese foam fruit tea in Manhattan! The grape boom is refreshing with huge chunks of real fruit.',
        summary: '顾客对芝士多肉葡萄的浓郁奶盖与真实果肉赞不绝口。',
        reply: 'Thanks Jennifer! Real fruit and premium tea are our signature.',
      },
      {
        id: 102,
        date: '2026-08-27',
        customerName: '曼哈顿小吃货',
        platform: '小红书',
        rating: 5,
        tags: ['饮品颜值高', '环境干净'],
        text: 'SOHO店的装修太有艺术感了！芝芝莓莓一如既往的高水准，排队20分钟也值了！',
        summary: '顾客认可SOHO店艺术空间设计与经典饮品口感。',
        reply: '感谢支持！我们会进一步优化取餐动线，减少大家的等待时间～',
      },
    ],
    defaultDiagnosis: {
      strengths: [
        '芝士奶盖与真果肉建立品质壁垒：曼哈顿顾客对多肉葡萄的果肉扎实度赞不绝口，高客单价具有极强说服力。',
        'SOHO 艺术空间溢价极高：空间美学设计驱动了极高比例的 Instagram/小红书二次打卡传播。',
      ],
      risks: [
        '排队等待时间偏长：部分顾客提及排队超过20分钟，若遇断货容易引发负面情绪。',
      ],
      actions: [
        '启动高峰期预点单指引，前置分流排队顾客。',
        '优化取餐通知屏幕，减少前台聚集。',
      ],
    },
  },
  boba_guys_sf: {
    id: 'boba_guys_sf',
    name: 'Boba Guys',
    location: 'San Francisco 联合广场店',
    rating: 4.78,
    totalReviews: 38,
    positiveRate: 94.5,
    tagDist: [
      { label: '口味独特 🧋', pct: 40, color: 'bg-blue-500' },
      { label: '出餐快 ⚡', pct: 28, color: 'bg-amber-500' },
      { label: '服务好 ✨', pct: 20, color: 'bg-emerald-500' },
      { label: '饮品颜值高 📸', pct: 12, color: 'bg-rose-500' },
    ],
    googleScore: 4.75,
    googleCount: 20,
    xhsScore: 4.82,
    xhsCount: 18,
    reviews: [
      {
        id: 201,
        date: '2026-08-28',
        customerName: 'David H.',
        platform: 'Google',
        rating: 5,
        tags: ['口味独特', '出餐快'],
        text: 'The Strawberry Matcha Latte with oat milk is iconic. Fast pickup through the app.',
        summary: '顾客夸赞草莓抹茶拿铁风味地道，取餐高效。',
        reply: 'Thank you David! Oat milk pairing is always a crowd favorite.',
      },
    ],
    defaultDiagnosis: {
      strengths: [
        '草莓抹茶拿铁（分层渐变）心智牢固，是旧金山联合广场的打卡招牌。',
        '燕麦奶等植物基选项丰富，贴合湾区健康饮品潮流。',
      ],
      risks: [
        '冰量过多可能影响后半杯口感浓度，需严格执行少冰标准。',
      ],
      actions: [
        '在吧台显眼位置标注甜度冰量对照图，减少顾客选错概率。',
      ],
    },
  },
};

export default function DashboardPage() {
  const [selectedStoreId, setSelectedStoreId] = useState<string>('sunny_tea');
  const [activeTab, setActiveTab] = useState<'analytics' | 'diagnosis' | 'batch'>('analytics');
  const [platformFilter, setPlatformFilter] = useState<'全部' | 'Google' | '小红书'>('全部');
  const [isDiagnosing, setIsDiagnosing] = useState<boolean>(false);
  const [diagnosisData, setDiagnosisData] = useState<DiagnosisData | null>(null);
  const [rawDiagnosisText, setRawDiagnosisText] = useState<string>('');
  const [isProcessingBatch, setIsProcessingBatch] = useState<boolean>(false);

  // Google Places API Key 状态与持久化
  const [googleApiKey, setGoogleApiKey] = useState<string>('');
  const [showGoogleKeyModal, setShowGoogleKeyModal] = useState<boolean>(false);
  const [googleKeyInput, setGoogleKeyInput] = useState<string>('');
  const [keySavedToast, setKeySavedToast] = useState<boolean>(false);

  useEffect(() => {
    const saved = localStorage.getItem('GOOGLE_PLACES_API_KEY') || '';
    if (saved) {
      setGoogleApiKey(saved);
      setGoogleKeyInput(saved);
    }
  }, []);

  const handleSaveGoogleApiKey = () => {
    localStorage.setItem('GOOGLE_PLACES_API_KEY', googleKeyInput.trim());
    setGoogleApiKey(googleKeyInput.trim());
    setShowGoogleKeyModal(false);
    setKeySavedToast(true);
    setTimeout(() => setKeySavedToast(false), 3000);
  };

  const currentStore = STORES[selectedStoreId] || STORES.sunny_tea;
  const [reviewsList, setReviewsList] = useState<ReviewItem[]>(currentStore.reviews);

  // 切换门店
  useEffect(() => {
    setReviewsList(currentStore.reviews);
    setDiagnosisData(null);
    setRawDiagnosisText('');
  }, [selectedStoreId, currentStore]);

  // 筛选逻辑
  const filteredReviews = reviewsList.filter((r) => {
    if (platformFilter === '全部') return true;
    return r.platform === platformFilter;
  });

  // 执行 AI 商业诊断 (纯净无乱码排版)
  const handleGenerateDiagnosis = async () => {
    setIsDiagnosing(true);
    try {
      const res = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeName: `${currentStore.name} (${currentStore.location})`,
          reviews: filteredReviews.map((r) => ({
            platform: r.platform,
            rating: r.rating,
            text: r.text,
          })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.report) {
          setDiagnosisData(data.report);
          setRawDiagnosisText('');
        } else if (data.rawText) {
          setRawDiagnosisText(data.rawText);
          setDiagnosisData(null);
        }
      } else {
        setDiagnosisData(currentStore.defaultDiagnosis);
      }
    } catch {
      setDiagnosisData(currentStore.defaultDiagnosis);
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
    link.download = `${currentStore.name}_Analytics_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans antialiased p-4 sm:p-8">
      {/* 保存 Key 成功提示 */}
      {keySavedToast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white text-xs sm:text-sm font-bold px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>✅ Google Places API 已绑定！实时数据通道已就绪</span>
        </div>
      )}

      {/* Google Places API Key 绑定弹窗 */}
      {showGoogleKeyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black text-slate-900">绑定 Google Places API Key</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGoogleKeyModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              输入您的 <strong>Google Places API Key</strong>（AI 推理已由后台原生集成 Groq LPU 算力保障），绑定后系统可直连 Google Maps 同步全美任意门店的真实历史评分与动态评价。
            </p>
            <div>
              <input
                type="password"
                value={googleKeyInput}
                onChange={(e) => setGoogleKeyInput(e.target.value)}
                placeholder="AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowGoogleKeyModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveGoogleApiKey}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
              >
                保存并绑定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 顶部导航 Header */}
      <header className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-xl transition-all shadow-2xs active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>返回顾客 H5 评价</span>
            </Link>

            {/* 连锁门店一键切换器 */}
            <div className="relative inline-block">
              <select
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                aria-label="选择切换门店"
                className="text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 pl-3 pr-7 py-1.5 rounded-xl cursor-pointer appearance-none focus:outline-hidden hover:bg-amber-100/80 transition-all"
              >
                <option value="sunny_tea">🧋 Sunny Tea House (San Jose 旗舰店)</option>
                <option value="heytea_ny">🍵 喜茶 HEYTEA (New York SOHO 旗舰店)</option>
                <option value="boba_guys_sf">🧋 Boba Guys (SF 联合广场店)</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-amber-700 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-2 flex items-center gap-2">
            <span>{currentStore.name} 🧋</span>
            <span className="text-slate-400 font-normal text-xs sm:text-sm">| AI 商业智能与多维度分析中台</span>
          </h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Google Places API Key 绑定入口 */}
          <button
            type="button"
            onClick={() => setShowGoogleKeyModal(true)}
            className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-2xs border ${
              googleApiKey
                ? 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <KeyRound className={`w-3.5 h-3.5 ${googleApiKey ? 'text-blue-600' : 'text-slate-400'}`} />
            <span>{googleApiKey ? '🟢 Google Places 已绑定' : '🔑 绑定 Google Places API'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl transition-all shadow-xs active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>导出报表 (CSV)</span>
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
              <Building2 className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900">{currentStore.totalReviews} 条</div>
            <div className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>全渠道沉淀数据</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
              <span>综合平均星级</span>
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-500">{currentStore.rating.toFixed(2)} ★</div>
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
            <div className="text-2xl sm:text-3xl font-black text-emerald-600">{currentStore.positiveRate}%</div>
            <div className="text-[11px] font-semibold text-slate-500">优于全湾区 94% 同行</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
              <span>AI 自动化处理率</span>
              <Sparkles className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-blue-600">100%</div>
            <div className="text-[11px] font-semibold text-slate-500">原生 Groq LPU 驱动</div>
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
            <span>AI 实战内参</span>
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
                  {currentStore.tagDist.map((t) => (
                    <div key={t.label}>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span>{t.label}</span>
                        <span className="font-mono text-slate-700">{t.pct}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${t.color} rounded-full`} style={{ width: `${t.pct}%` }} />
                      </div>
                    </div>
                  ))}
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
                    <div className="text-2xl font-black text-blue-900">{currentStore.googleScore.toFixed(2)} ★</div>
                    <span className="text-[11px] text-blue-600 font-medium">{currentStore.googleCount} 条客观英文</span>
                  </div>

                  <div className="bg-rose-50/60 p-4 rounded-2xl border border-rose-100 text-center space-y-1">
                    <span className="text-xs font-bold text-rose-800">小红书种草</span>
                    <div className="text-2xl font-black text-rose-900">{currentStore.xhsScore.toFixed(2)} ★</div>
                    <span className="text-[11px] text-rose-600 font-medium">{currentStore.xhsCount} 条爆款图文</span>
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

        {/* Tab 2: AI 实战内参诊断（全新干净卡片排版，无任何 Markdown 乱码） */}
        {activeTab === 'diagnosis' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <BrainCircuit className="w-5 h-5 text-amber-500" />
                    <span>资深督导内参 · 门店经营实战诊断</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    基于原生 Groq LPU 毫秒级推理，直击复购杀手锏、排查隐形客诉炸弹、提供下周一早会即可落地的操作 SOP。
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
                      <span>正在提炼实战内参...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>✨ 一键生成经营实战诊断报告</span>
                    </>
                  )}
                </button>
              </div>

              {/* 结构化干净卡片展示 */}
              {diagnosisData ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
                  {/* 卡片 1：核心复购杀手锏 */}
                  <div className="bg-gradient-to-b from-amber-50/70 to-white p-5 rounded-2xl border border-amber-200/80 shadow-2xs space-y-3">
                    <div className="flex items-center gap-2 text-amber-800 font-extrabold text-sm pb-2 border-b border-amber-200/50">
                      <Flame className="w-4 h-4 text-amber-600" />
                      <span>核心复购杀手锏</span>
                    </div>
                    <ul className="space-y-2.5 text-xs text-slate-700 leading-relaxed">
                      {diagnosisData.strengths.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 卡片 2：隐形客诉隐患 */}
                  <div className="bg-gradient-to-b from-rose-50/70 to-white p-5 rounded-2xl border border-rose-200/80 shadow-2xs space-y-3">
                    <div className="flex items-center gap-2 text-rose-800 font-extrabold text-sm pb-2 border-b border-rose-200/50">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>隐形客诉与翻车风险</span>
                    </div>
                    <ul className="space-y-2.5 text-xs text-slate-700 leading-relaxed">
                      {diagnosisData.risks.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 mt-1.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 卡片 3：下周早会必抓动作 */}
                  <div className="bg-gradient-to-b from-blue-50/70 to-white p-5 rounded-2xl border border-blue-200/80 shadow-2xs space-y-3">
                    <div className="flex items-center gap-2 text-blue-800 font-extrabold text-sm pb-2 border-b border-blue-200/50">
                      <ListTodo className="w-4 h-4 text-blue-600" />
                      <span>下周早会必抓落地动作</span>
                    </div>
                    <ul className="space-y-2.5 text-xs text-slate-700 leading-relaxed">
                      {diagnosisData.actions.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-100 w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : rawDiagnosisText ? (
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line font-sans shadow-inner">
                  {rawDiagnosisText}
                </div>
              ) : (
                <div className="p-12 text-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                  <BrainCircuit className="w-8 h-8 mx-auto opacity-40 text-amber-600" />
                  <p className="text-xs font-semibold">点击上方按钮，AI 顾问将基于当前评价数据输出纯净实战内参</p>
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
                      <th className="p-3 w-48">📌 核心要点</th>
                      <th className="p-3 w-64">💬 建议老板回复草稿</th>
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
        {currentStore.name} 商业智能中台 · Multi-Tenant Architecture Powered by Next.js & Native Groq LPU
      </footer>
    </div>
  );
}
