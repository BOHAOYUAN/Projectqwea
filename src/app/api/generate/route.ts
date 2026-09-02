import { NextResponse } from 'next/server';

/*
 * Retired implementation retained below only until the next repository
 * cleanup. It is deliberately outside the module graph: this endpoint used
 * to bypass the tenant-scoped, grounded review flow.
 *

type Platform = 'Google' | '小红书';

interface GenerateRequest {
  platform: Platform;
  tags: string[];
  userInput: string;
  seed: number;
}

const TAG_EN_MAP: Record<string, string> = {
  服务好: 'friendly and welcoming service',
  技师专业: 'professional and attentive therapist',
  环境干净: 'clean, peaceful, and comfortable treatment space',
  放松舒适: 'deeply relaxing and comfortable experience',
  效果满意: 'felt refreshed and cared for after the treatment',
  手法专业: 'skilled and thoughtful technique',
  皮肤水润: 'skin felt hydrated and refreshed',
  头皮清爽: 'scalp felt clean and refreshed',
  性价比高: 'great value for money',
};

const GOOGLE_SYSTEM_PROMPT = `You are a customer in Baltimore, Maryland writing a Google Maps review for ${BUSINESS_CONFIG.name}, a beauty and wellness spa at ${BUSINESS_CONFIG.address}.
CRITICAL RULES:
1. Output only natural, fluent American English.
2. Translate non-English experience details naturally; never include translation notes.
3. Sound authentic, relaxed, and specific. Never invent medical claims, guaranteed results, prices, staff names, or services not mentioned by the customer.
4. Write 2-3 short paragraphs and keep the review between 50 and 70 words.
5. Output only the plain-text review without headings, quotation marks, or commentary.`;

const XHS_SYSTEM_PROMPT = `你是一位在美国生活的美容护理体验分享者，刚刚到访 Baltimore 的 ${BUSINESS_CONFIG.name}。
核心规范：
1. 除品牌名和地点外，使用自然中文。
2. 第1行写带 Emoji 和 Baltimore 地点信息的自然标题。
3. 正文写3-4个短段落，段落之间留空行。
4. 围绕顾客明确提供的护理体验与标签展开。
5. 可穿插适量 Emoji（✨💆🌿💖），语气真实自然。
6. 结尾附3个相关话题标签，如 #Baltimore探店 #美容护理 #头疗SPA。
7. 不虚构疗效、价格、技师姓名或顾客未提供的体验。
8. 直接输出纯文本，不要 Markdown 代码块。`;

const GOOGLE_FALLBACKS = [
  (details: string) =>
    `I had such a relaxing visit at ${BUSINESS_CONFIG.name} in Baltimore.\n\n${details ? `What stood out most was the ${details}. ` : ''}The space felt clean and peaceful, and the service was attentive from start to finish.\n\nI left feeling refreshed and would happily come back.`,
  (details: string) =>
    `Really enjoyed my appointment at ${BUSINESS_CONFIG.name}.\n\n${details ? `I especially appreciated the ${details}. ` : ''}Everything felt calm, comfortable, and thoughtfully handled without being rushed.\n\nA lovely Baltimore spot when you want to unwind and take care of yourself.`,
  (details: string) =>
    `${BUSINESS_CONFIG.name} made my spa visit feel easy and genuinely restorative.\n\n${details ? `The highlights for me were the ${details}. ` : ''}The treatment space was welcoming and the service felt professional throughout.\n\nI would definitely recommend giving this Baltimore beauty spa a try.`,
];

const XHS_FALLBACKS = [
  (details: string) =>
    `✨在Baltimore解锁超放松的SPA体验\n\n这次来${BUSINESS_CONFIG.name}做护理，${details || '技师专业又细心，整个过程很舒服'}。\n\n环境干净安静，节奏不赶，做完感觉整个人都轻松了很多。想给自己安排放松时间的可以收藏～\n\n#Baltimore探店 #美容护理 #头疗SPA`,
  (details: string) =>
    `💆Baltimore宝藏美容护理店\n\n在${BUSINESS_CONFIG.name}体验后最直观的感受就是：${details || '服务细致，过程很放松'}。\n\n从进门到结束都很舒适，空间也清爽整洁。适合忙完一周来认真放松一下自己🌿\n\n#Baltimore生活 #面部SPA #美容护理`,
  (details: string) =>
    `🌿把周末留给一场舒服的SPA\n\n这次在${BUSINESS_CONFIG.name}体验了护理，${details || '手法专业，服务也很有耐心'}。\n\n过程安静放松，没有催促感，结束后状态很清爽。下次想试试店里的其他护理项目✨\n\n#Baltimore探店 #背部SPA #放松时刻`,
];

function getLocalFallback(platform: Platform, tags: string[], userInput: string, seed: number): string {
  const index = Math.abs(seed) % GOOGLE_FALLBACKS.length;

  if (platform === 'Google') {
    const englishInput = /[\u4e00-\u9fa5]/.test(userInput) ? '' : userInput;
    const englishTags = tags.map((tag) => TAG_EN_MAP[tag] || tag).join(', ');
    const details =
      [englishInput, englishTags].filter(Boolean).join(', ') ||
      'professional service and a relaxing spa experience';
    return GOOGLE_FALLBACKS[index](details);
  }

  const details = [userInput, tags.join('、')].filter(Boolean).join('，') || '服务专业、过程放松';
  return XHS_FALLBACKS[index](details);
}

async function triggerWecomWebhookAsync(
  reviewText: string,
  platform: Platform,
  tags: string[],
  userInput: string,
  apiKey: string,
  apiUrl: string,
  model: string
) {
  const webhookUrl = process.env.WEWORK_WEBHOOK || process.env.WECOM_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    const summaryPrompt = `请将以下评论提炼为20字以内的中文摘要，并生成一段给美容与头疗SPA店老板的回复草稿（50字，亲切感谢口吻）。
评论内容：${reviewText}
请输出纯JSON：{"summary":"20字中文摘要","replyDraft":"50字感谢回复草稿"}`;

    const aiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: summaryPrompt }],
        temperature: 0.3,
      }),
    });

    let summary = '顾客对专业护理与放松体验给予高度评价。';
    let replyDraft = `感谢您对${BUSINESS_CONFIG.name}的认可，期待再次为您提供舒适细致的护理体验！`;

    if (aiResponse.ok) {
      const data = await aiResponse.json();
      try {
        const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}') as {
          summary?: string;
          replyDraft?: string;
        };
        if (parsed.summary) summary = parsed.summary;
        if (parsed.replyDraft) replyDraft = parsed.replyDraft;
      } catch {
        // Keep safe local defaults when the upstream output is not valid JSON.
      }
    }

    const tagDisplay = tags.length > 0 ? tags.join(' / ') : userInput ? '自由输入描述' : '优质体验';
    const wecomPayload = {
      msgtype: 'markdown',
      markdown: {
        content: `### ✨ ${BUSINESS_CONFIG.name} 新评价通知\n> **来源平台**：<font color="info">${platform}</font>\n> **用户标签/输入**：<font color="comment">${tagDisplay}</font>\n\n**📝 评价内容**：\n>${reviewText.slice(0, 120)}\n\n**📌 AI 核心摘要 (20字)**：\n>${summary}\n\n**💬 建议老板回复草稿 (50字)**：\n>${replyDraft}\n\n> <font color="comment">⏰ 生成时间：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}</font>`,
      },
    };

    if (!webhookUrl.includes('mock') && !webhookUrl.includes('demo')) {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wecomPayload),
      });
    }
  } catch (error) {
    console.warn('[WeCom Webhook Background Task Error]:', error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<GenerateRequest>;
    const platform: Platform = body.platform === 'Google' ? 'Google' : '小红书';
    const tags = Array.isArray(body.tags) ? body.tags.filter((tag): tag is string => typeof tag === 'string') : [];
    const userInput = typeof body.userInput === 'string' ? body.userInput : '';
    const randomSeed = typeof body.seed === 'number' ? body.seed : Date.now();

    const apiKey = process.env.GROQ_API_KEY || process.env.DEEPSEEK_API_KEY || '';
    const apiUrl = process.env.DEEPSEEK_API_KEY
      ? 'https://api.deepseek.com/v1/chat/completions'
      : 'https://api.groq.com/openai/v1/chat/completions';
    const model = process.env.DEEPSEEK_API_KEY
      ? 'deepseek-chat'
      : process.env.DEFAULT_MODEL || 'openai/gpt-oss-120b';

    const englishTags = tags.map((tag) => TAG_EN_MAP[tag] || tag).join(', ');
    let userPrompt: string;

    if (platform === 'Google') {
      const details: string[] = [];
      if (userInput.trim()) details.push(`Customer typed thoughts: "${userInput.trim()}"`);
      if (englishTags) details.push(`Selected tags: [${englishTags}]`);
      userPrompt = `${details.join('. ') || 'Customer had a professional and relaxing spa experience.'} Translate any non-English concepts into authentic American customer language and write a realistic Google review (variation #${randomSeed % 100}).`;
    } else {
      const details: string[] = [];
      if (userInput.trim()) details.push(`顾客打字描述：“${userInput.trim()}”`);
      if (tags.length > 0) details.push(`勾选感受标签：【${tags.join('、')}】`);
      userPrompt = `${details.join('；') || '顾客护理体验很好。'}请根据这些真实细节写一篇自然的小红书体验笔记（视角批次 #${randomSeed % 100}）。`;
    }

    const tagSummary = tags.length > 0 ? tags.join('、') : userInput.slice(0, 15) || '护理体验良好';
    const bonusSummary = `顾客赞赏了${tagSummary}，整体体验优秀。`;
    const bonusReplyDraft = `亲爱的顾客，感谢您对 ${BUSINESS_CONFIG.name} 的认可与支持，期待再次为您提供舒适细致的护理体验！`;

    if (!apiKey) {
      return NextResponse.json({
        review: getLocalFallback(platform, tags, userInput, randomSeed),
        summary: bonusSummary,
        replyDraft: bonusReplyDraft,
        success: true,
      });
    }

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: platform === 'Google' ? GOOGLE_SYSTEM_PROMPT : XHS_SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.9,
        }),
      });

      if (!response.ok) throw new Error(`Upstream AI Error: ${response.statusText}`);

      const data = await response.json();
      let reviewText =
        data.choices?.[0]?.message?.content?.trim() ||
        getLocalFallback(platform, tags, userInput, randomSeed);

      if (platform === 'Google' && /[\u4e00-\u9fa5]/.test(reviewText)) {
        reviewText = getLocalFallback('Google', tags, userInput, randomSeed);
      }
      if (platform === '小红书' && !/[\u4e00-\u9fa5]/.test(reviewText)) {
        reviewText = getLocalFallback('小红书', tags, userInput, randomSeed);
      }

      void triggerWecomWebhookAsync(
        reviewText,
        platform,
        tags,
        userInput,
        apiKey,
        apiUrl,
        model
      );

      return NextResponse.json({
        review: reviewText,
        summary: bonusSummary,
        replyDraft: bonusReplyDraft,
        success: true,
      });
    } catch (error) {
      console.warn('API call failed, using local fallback:', error);
      return NextResponse.json({
        review: getLocalFallback(platform, tags, userInput, randomSeed),
        summary: bonusSummary,
        replyDraft: bonusReplyDraft,
        success: true,
      });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '服务器内部处理异常';
    return NextResponse.json({ error: message, success: false }, { status: 500 });
  }
}
*/

export async function POST() {
  return NextResponse.json(
    {
      error: 'This legacy endpoint has been retired. Use the public review page to create a grounded draft.',
      code: 'LEGACY_ENDPOINT_RETIRED',
    },
    { status: 410 }
  );
}
