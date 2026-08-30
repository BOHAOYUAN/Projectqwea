import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPT = `你是一位在北美（加州湾区/纽约）操盘过多家人气茶饮连锁、实战经验超过15年的资深餐饮督导兼品牌主理人。
你的风格：老道、犀利、极度务实、拒绝套话与公文腔，句句直击门店毛利、出餐SOP、翻台率与顾客复购心理。
禁止输出任何 markdown 标题符号（如 ###、##）、星号（**）或反引号（\`）。
请严格按照纯文本段落格式输出，分点清晰，用语接地气。`;

export async function POST(req: NextRequest) {
  try {
    const { reviews = [], storeName = 'Sunny Tea House' } = await req.json();

    const apiKey =
      process.env.GROQ_API_KEY ||
      process.env.DEEPSEEK_API_KEY ||
      '';

    const apiUrl = process.env.DEEPSEEK_API_KEY
      ? 'https://api.deepseek.com/v1/chat/completions'
      : 'https://api.groq.com/openai/v1/chat/completions';

    const model = process.env.DEEPSEEK_API_KEY
      ? 'deepseek-chat'
      : process.env.DEFAULT_MODEL || 'llama-3.3-70b-versatile';

    const reviewsText =
      reviews.length > 0
        ? reviews.slice(0, 25).map((r: { platform: string; rating: number; text: string }) => `- [${r.platform} ${r.rating}星]: ${r.text}`).join('\n')
        : '顾客普遍评价出餐快、茶香浓郁、珍珠筋道、拍照出片，但高峰期排队略有拥挤。';

    const userPrompt = `店名：${storeName}
以下是这家店最近从 Google 和小红书收集到的顾客一手评价：
${reviewsText}

请直接输出一份给老板和店长看的实战内参诊断（严禁使用任何 markdown 符号、星号 ** 或井号 #）：

【核心复购杀手锏】
列出 3 条顾客持续掏钱的核心理由（单品优势、工序壁垒、体验细节）。

【隐形客诉隐患】
列出 2 个最容易在高峰期翻车的产品或排队动线细节。

【下周早会必抓动作】
列出 3 个店长下周一早会必须直接安排员工落地的具体动作。`;

    if (!apiKey) {
      // 干净、无 Markdown 乱码的纯净实战内参
      return NextResponse.json({
        success: true,
        report: {
          strengths: [
            "3分钟极速出餐锁死下午茶刚需：湾区上班族和学生最怕排队，把出品速度压在4分钟以内，是压制周边竞品的最强护城河。",
            "真茶底香气立住客单价：评价反复夸赞烘焙乌龙茶底有真茶香而不是香精味，证明茶叶原材料没省是对的，直接拉开和街头廉价奶茶的档次。",
            "渐变色杯身成为天然免费广告：杨枝甘露和多肉葡萄的分层特写在小红书自发裂变，顾客买的不仅是饮品，更是社交打卡货币。"
          ],
          risks: [
            "店外排队动线混乱（随时可能产生1星差评）：周末高峰期堂食取餐和外卖骑手全挤在门口狭窄通道。现在没差评是因为出餐快，一旦遇到爆单，门口立刻会变成拥堵冲突点。",
            "手作珍珠批次口感轻微波动：部分老顾客提到某天珍珠偏软。下午两点和傍晚六点这两批珍珠的焖煮时间需要统一校准，避免新员工凭感觉出锅。"
          ],
          actions: [
            "地贴动线改造（预算20美元）：在门口用醒目贴纸分出【现场取餐通道】和【点单等待区】，让动线顺时针单向流动，彻底告别堵门。",
            "吧台 NFC 亚克力牌前置：把碰一碰立牌从角落挪到打包递杯区，店员递饮品时顺口引导扫码好评赠送小优惠，每天稳定沉淀20条真实好评。",
            "珍珠煮制实行定时器硬考核：将焖煮25分钟加冰水过温的标准写成大字贴在后厨墙上，锁死每锅珍珠的Q弹一致性。"
          ]
        }
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
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      throw new Error(`Upstream API Error: ${response.statusText}`);
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content?.trim() || '';

    // 清理掉所有 markdown 符号
    const cleanText = rawText.replace(/[*#`_~]/g, '');

    return NextResponse.json({
      success: true,
      rawText: cleanText,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : '诊断生成异常';
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
