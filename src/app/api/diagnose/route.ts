import { NextResponse } from 'next/server';

/*
 * Retired implementation retained below only until the next repository
 * cleanup. It was an unauthenticated model proxy and does not belong in the
 * initial member-scoped operations release.
 *

const SYSTEM_PROMPT = `你是一位在美国经营美容护理、头疗与SPA门店超过15年的资深运营顾问。
你的风格：老道、务实、拒绝套话，关注服务标准、预约效率、顾客复购、卫生体验与合规表达。
禁止输出任何 markdown 标题符号（如 ###、##）、星号（**）或反引号（\`）。
请严格按照纯文本段落格式输出，分点清晰，用语接地气。`;

export async function POST(req: NextRequest) {
  try {
    const { reviews = [], storeName = BUSINESS_CONFIG.name } = await req.json();

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
        : '顾客普遍评价技师专业、环境干净、护理过程放松，但预约高峰时段可能需要等待。';

    const userPrompt = `店名：${storeName}
以下是这家店最近从 Google 和小红书收集到的顾客一手评价：
${reviewsText}

请直接输出一份给老板和店长看的实战内参诊断（严禁使用任何 markdown 符号、星号 ** 或井号 #）：

【核心复购杀手锏】
列出 3 条顾客持续复购的核心理由（服务优势、流程标准、体验细节）。

【隐形客诉隐患】
列出 2 个最容易引发客诉的预约、护理流程或卫生体验细节。

【下周早会必抓动作】
列出 3 个店长下周一早会必须直接安排员工落地的具体动作。`;

    if (!apiKey) {
      // 干净、无 Markdown 乱码的纯净实战内参
      return NextResponse.json({
        success: true,
        report: {
          strengths: [
            "专业手法建立复购信任：顾客反复提到技师细致、力度沟通充分，说明服务过程本身就是最强复购理由。",
            "面部与头疗组合提升体验完整度：顾客能在一次到店中兼顾清洁与放松，适合设计清晰的组合服务路径。",
            "干净安静的环境降低首次到店门槛：美容与SPA消费高度依赖安全感，整洁、私密和不催促是口碑传播的基础。"
          ],
          risks: [
            "预约高峰等待感会放大：如果上一位护理超时却没有及时告知下一位顾客，放松体验会在开始前就被抵消。",
            "服务标准不一致容易形成落差：头疗力度、面部清洁步骤和背部护理时长需要记录，避免顾客换技师后体验波动。"
          ],
          actions: [
            "建立预约缓冲：每个护理时段预留10分钟整理与消毒，并在延迟超过5分钟时主动告知顾客。",
            "把 NFC 好评牌放在结账与离店动线上：员工在顾客明确表达满意后再自然邀请评价，不用统一话术施压。",
            "建立三项核心服务检查表：面部SPA、头疗SPA、背部SPA分别记录步骤、时长、力度偏好与顾客反馈。"
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
*/

export async function POST() {
  return NextResponse.json(
    { error: 'Review diagnosis is not enabled in this release.', code: 'FEATURE_NOT_ENABLED' },
    { status: 410 }
  );
}
