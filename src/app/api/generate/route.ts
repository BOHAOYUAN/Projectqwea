import { NextRequest, NextResponse } from 'next/server';

// English semantic mapping for Chinese tags to prevent multi-lingual leakage
const TAG_EN_MAP: Record<string, string> = {
  '服务好': 'friendly and welcoming staff',
  '出餐快': 'super fast turnaround even during rush hour',
  '环境干净': 'clean and cozy seating atmosphere',
  '饮品颜值高': 'gorgeous and photo-worthy drink presentation',
  '口味独特': 'rich authentic tea aroma and perfectly balanced sweetness',
  '珍珠筋道': 'super chewy and springy boba pearls',
  '分量足': 'generous and satisfying portions',
  '性价比高': 'great value for money',
  '茶香浓郁': 'deep fragrant tea flavor',
};

// 1. Core Strict System Prompts
const GOOGLE_SYSTEM_PROMPT = `You are a genuine local foodie living in San Jose, California (Bay Area) writing a Google Maps review for Sunny Tea House boba shop.
CRITICAL RULES:
1. Output ONLY in 100% natural, fluent American English.
2. NEVER output any Chinese characters, Chinese punctuation, or translation notes under any circumstances. If custom tags are in Chinese, seamlessly translate them into natural English foodie descriptions.
3. Tone: Authentic, relaxed, objective, like a real Google Local Guide (avoid robotic marketing buzzwords).
4. Format: 2 to 3 short paragraphs with a blank line between each for effortless mobile reading. Keep length strictly between 50 and 70 words.
5. Output ONLY the raw plain text review without quotation marks, markdown headings, or commentary.`;

const XHS_SYSTEM_PROMPT = `你是一位常驻美国加州湾区（圣何塞 San Jose）的小红书资深探店博主。
核心排版与风格规范：
1. 语言：必须全中文输出（除品牌名 Sunny Tea House 与地点 San Jose 以外，严禁夹杂任何英文字句）。
2. 爆款标题：第1行必须带有 Emoji 和地点（如：🧋在San Jose挖到了宝藏神仙奶茶！✨）。
3. 正文呼吸感排版：3-4个精炼微段落，段与段之间必须空出一行，绝不能堆叠大段文字。
4. 穿插灵动Emoji（🧋✨🍵💖🔥），语气热情、网络化、闺蜜安利感。
5. 结尾附带3个相关话题标签（如：#奶茶推荐 #圣何塞美食 #湾区探店）。
6. 直接输出纯文本内容，不要输出Markdown代码块。`;

// 2. Intelligent Pure-English & Pure-Chinese Diverse Fallbacks
const GOOGLE_FALLBACKS = [
  (tags: string) => `Sunny Tea House in San Jose is hands down one of my favorite boba spots in the South Bay!\n\nThe ${tags} really made my visit memorable. The boba texture was super chewy and fresh, and the sweetness level was spot on.\n\nDefinitely my new go-to place whenever I'm in San Jose!`,
  (tags: string) => `Checked out Sunny Tea House for a quick afternoon pick-me-up. The tea aroma hit me the second I walked in.\n\nReally appreciated the ${tags}. Drinks came out super fast and tasted genuinely authentic without being artificial.\n\nSolid 5-star spot in San Jose, highly recommend!`,
  (tags: string) => `If you're in the South Bay and craving quality boba, Sunny Tea House never disappoints.\n\nThe highlights for me were definitely the ${tags}. Clean store, great vibe, and well-balanced flavors.\n\nWill definitely be bringing friends here next time!`,
];

const XHS_FALLBACKS = [
  (tags: string) => `🧋在San Jose挖到宝藏奶茶店啦！Sunny Tea House亲测不踩雷✨\n\n店员真的超级热情，${tags}！\n\n奶茶口感醇厚，珍珠Q弹软糯，甜度刚刚好～\n\n拍照打卡巨出片，湾区的宝子们快冲！\n\n#奶茶推荐 #圣何塞美食 #湾区探店`,
  (tags: string) => `✨湾区下午茶天花板！被Sunny Tea House惊艳到了💖\n\n今天和闺蜜去打卡，${tags}体验感直接拉满！\n\n茶底清香不甜腻，奶味丝滑，每一口都超治愈～\n\n就在San Jose，周末不知道去哪儿的赶紧收藏！🧋🔥\n\n#圣何塞探店 #周末去哪儿 #湾区奶茶`,
  (tags: string) => `🔥答应我！去San Jose一定要喝Sunny Tea House！🧋\n\n亲测必点招牌奶茶，${tags}真不是吹的！\n\n包装颜值巨高，出餐速度飞快，喝完一杯毫无负担～\n\n路过的宝子千万别错过呀！🍵✨\n\n#加州美食 #奶茶测评 #硅谷探店`,
];

function getLocalFallback(platform: string, tags: string[], seed: number = 0): string {
  const index = Math.abs(seed) % 3;
  if (platform === 'Google') {
    const enTags = tags
      .map((t) => TAG_EN_MAP[t] || t)
      .join(', ') || 'friendly staff and great boba';
    return GOOGLE_FALLBACKS[index](enTags);
  } else {
    const tagStr = tags.join('、') || '服务好、出餐快';
    return XHS_FALLBACKS[index](tagStr);
  }
}

// 3. Asynchronous Enterprise WeChat Webhook Task (Non-blocking)
async function triggerWecomWebhookAsync(
  reviewText: string,
  platform: string,
  tags: string[],
  apiKey: string,
  apiUrl: string,
  model: string
) {
  const webhookUrl = process.env.WEWORK_WEBHOOK || process.env.WECOM_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    const summaryPrompt = `请将以下主评论提炼为20字以内的中文摘要，并生成一段给奶茶店老板的回复草稿（50字，亲切感谢口吻）。
主评论内容：${reviewText}
请输出纯JSON：{"summary": "20字中文摘要", "replyDraft": "50字感谢回复草稿"}`;

    const aiRes = await fetch(apiUrl, {
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

    let summary = '顾客对饮品品质与服务效率给予高度评价。';
    let replyDraft = '感谢您对Sunny Tea House的喜爱与支持，期待您的再次光临！';

    if (aiRes.ok) {
      const data = await aiRes.json();
      try {
        const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}');
        if (parsed.summary) summary = parsed.summary;
        if (parsed.replyDraft) replyDraft = parsed.replyDraft;
      } catch {
        // Safe fallback
      }
    }

    const wecomPayload = {
      msgtype: 'markdown',
      markdown: {
        content: `### 🧋 Sunny Tea House 新评价通知\n> **来源平台**：<font color="info">${platform}</font>\n> **用户标签**：<font color="comment">${tags.join(' / ')}</font>\n\n**📝 评价内容**：\n>${reviewText.slice(0, 120)}\n\n**📌 AI 核心摘要 (20字)**：\n>${summary}\n\n**💬 建议老板回复草稿 (50字)**：\n>${replyDraft}\n\n> <font color="comment">⏰ 生成时间：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}</font>`,
      },
    };

    if (!webhookUrl.includes('mock') && !webhookUrl.includes('demo')) {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wecomPayload),
      });
    }
  } catch (err) {
    console.warn('[WeCom Webhook Background Task Error]:', err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { platform = '小红书', tags = [], seed = Date.now() } = await req.json();

    const apiKey =
      process.env.GROQ_API_KEY ||
      process.env.DEEPSEEK_API_KEY ||
      '';

    const apiUrl = process.env.DEEPSEEK_API_KEY
      ? 'https://api.deepseek.com/v1/chat/completions'
      : 'https://api.groq.com/openai/v1/chat/completions';

    const model = process.env.DEEPSEEK_API_KEY
      ? 'deepseek-chat'
      : process.env.DEFAULT_MODEL || 'openai/gpt-oss-120b';

    const systemPrompt =
      platform === 'Google' ? GOOGLE_SYSTEM_PROMPT : XHS_SYSTEM_PROMPT;

    // Convert Chinese tags to English for Google prompt to prevent language leaking
    const englishTags = tags.map((t: string) => TAG_EN_MAP[t] || t).join(', ');

    const randomSeedNum = typeof seed === 'number' ? seed : Date.now();
    const userPrompt =
      platform === 'Google'
        ? `Customer experience highlights: ${englishTags || 'great boba and friendly service'}. Write a fresh, uniquely styled Google review in 100% English now (variation #${randomSeedNum % 100}).`
        : `顾客本次打卡 Sunny Tea House 体验标签：${tags.join('、') || '服务好、出餐快'}。请用全中文写一段全新的小红书种草笔记（视角批次 #${randomSeedNum % 100}）。`;

    // Smart summaries for bonus question
    const tagSummaryStr = tags.length > 0 ? tags.join('、') : '服务好、出餐快';
    const bonusSummary = `顾客赞赏了${tagSummaryStr}，整体体验优秀。`;
    const bonusReplyDraft = `亲爱的顾客，感谢您对 Sunny Tea House 的喜爱与支持，期待再次为您制作美味饮品！`;

    if (!apiKey) {
      const fallbackText = getLocalFallback(platform, tags, randomSeedNum);
      return NextResponse.json({
        review: fallbackText,
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
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.9, // Higher temperature so every "换一批" generates visibly distinct creative reviews
        }),
      });

      if (!response.ok) {
        throw new Error(`Upstream AI Error: ${response.statusText}`);
      }

      const data = await response.json();
      let reviewText =
        data.choices?.[0]?.message?.content?.trim() ||
        getLocalFallback(platform, tags, randomSeedNum);

      // Post-processing guard 1: Google English must NOT contain Chinese characters
      if (platform === 'Google' && /[\u4e00-\u9fa5]/.test(reviewText)) {
        reviewText = getLocalFallback('Google', tags, randomSeedNum);
      }

      // Post-processing guard 2: Xiaohongshu Chinese must be clean
      if (platform === '小红书' && !/[\u4e00-\u9fa5]/.test(reviewText)) {
        reviewText = getLocalFallback('小红书', tags, randomSeedNum);
      }

      // Trigger Webhook asynchronously in background (Non-blocking)
      triggerWecomWebhookAsync(reviewText, platform, tags, apiKey, apiUrl, model).catch(
        (err) => console.warn('Background webhook trigger error:', err)
      );

      return NextResponse.json({
        review: reviewText,
        summary: bonusSummary,
        replyDraft: bonusReplyDraft,
        success: true,
      });
    } catch (apiErr) {
      console.warn('API call failed, using pure fallback:', apiErr);
      const fallbackText = getLocalFallback(platform, tags, randomSeedNum);
      return NextResponse.json({
        review: fallbackText,
        summary: bonusSummary,
        replyDraft: bonusReplyDraft,
        success: true,
      });
    }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : '服务器内部处理异常';
    return NextResponse.json({ error: errMsg, success: false }, { status: 500 });
  }
}
