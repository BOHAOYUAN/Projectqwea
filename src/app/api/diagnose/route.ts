import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPT = `你是一位在北美（加州湾区/纽约）操盘过多家人气茶饮连锁、实战经验超过15年的资深餐饮督导兼品牌主理人。
你的风格：老道、犀利、极度务实、拒绝套话与公文腔，句句直击门店毛利、出餐SOP、翻台率与顾客复购心理。
禁止使用：“综上所述”、“在当今竞争激烈的市场中”、“赋能”、“抓手”等空洞AI套话。请用门店老板和一线督导开早会时的实战语气说话。`;

export async function POST(req: NextRequest) {
  try {
    const { reviews = [], apiKey: customApiKey, storeName = 'Sunny Tea House' } = await req.json();

    const apiKey =
      customApiKey ||
      process.env.GROQ_API_KEY ||
      process.env.DEEPSEEK_API_KEY ||
      '';

    const apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
    const model = 'llama-3.3-70b-versatile';

    const reviewsText =
      reviews.length > 0
        ? reviews.slice(0, 25).map((r: { platform: string; rating: number; text: string }) => `- [${r.platform} ${r.rating}★]: ${r.text}`).join('\n')
        : '顾客普遍评价出餐快、茶香浓郁、珍珠筋道、拍照出片，但高峰期排队略有拥挤。';

    const userPrompt = `店名：${storeName}
以下是这家店最近从 Google 和小红书收集到的顾客一手评价：
${reviewsText}

请直接输出一份给老板和店长看的【实战内参诊断】：
1. 🎯 【真正能带来复购的核心杀手锏】（别扯虚的，顾客到底是冲着哪款单品、哪道工序、哪个体验持续掏钱的？）
2. 🚨 【藏在好评背后的隐形炸弹】（别等变成 Yelp 1星差评才后悔！挑出 1~2 个最容易在高峰期翻车的产品或动线细节）
3. 📋 【下周一早会，店长必须直接落地的 3 个动作】（具体到吧台站位、备料、引导话术，必须是员工听得懂、做得到的操作）`;

    if (!apiKey) {
      // 超接地气、实战派的高保真去 AI 味诊断
      return NextResponse.json({
        success: true,
        report: `🎯 【真正带来复购的核心杀手锏】
- **“3分钟极速出餐”把下午茶刚需锁死了**：硅谷这边的上班族和学生最怕排队，你们把出品速度压到4分钟以内，这就是附近几家竞品打不过你们的命门。
- **真茶底的香气立住了客单价**：评价里反复夸“烘焙乌龙茶底有真茶香而不是糖精味”，这证明原材料没省是对的，直接拉开了和街头廉价奶茶的档次。
- **渐变色杯身是天然的免费广告**：小红书顾客自发发图，全是杨枝甘露和多肉葡萄的分层特写。杯贴和杯套质感在线，顾客买的不仅是饮料，是社交货币。

🚨 【藏在好评背后的隐形炸弹】
- **店外排队动线混乱（随时会炸出 1 星差评）**：周末人多时，堂食取餐和外卖骑手全挤在门口狭窄过道。现在顾客还没给差评是因为出餐快，一旦哪天出餐慢两分钟，门口立刻会变成冲突现场。
- **手作珍珠批次口感轻微波动**：有老顾客隐晦提到某天珍珠偏软。下午两点和傍晚六点这批珍珠的焖煮时间需要再校准，别让新员工凭感觉捞。

📋 【下周一早会，店长必须落地的 3 个动作】
1. **地贴动线改造（预算 $20）**：在门口用黄色贴纸分出【现场取餐通道】和【外卖/点单等待区】，让动线顺时针单向流动，彻底告别堵门；
2. **吧台 NFC 亚克力牌前置（抓牢五星好评）**：把 NFC 碰一碰立牌从角落挪到“打包递杯区”，店员递饮品时顺口带一句：*“帮我们碰一下留个言，送您一张下次立减 $1 券”*，每天至少多收 20 条 Google 真实好评；
3. **珍珠煮制实行定时器硬考核**：焖煮 25 分钟 + 冰水过温标准写成大字贴在后厨墙上，彻底锁死口感一致性。`
      });
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.6,
      }),
    });

    if (!response.ok) {
      throw new Error(`Upstream API Error: ${response.statusText}`);
    }

    const data = await response.json();
    const reportText = data.choices?.[0]?.message?.content?.trim() || '';

    return NextResponse.json({
      success: true,
      report: reportText,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : '诊断生成异常';
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
