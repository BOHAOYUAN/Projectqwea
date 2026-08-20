import { NextRequest, NextResponse } from 'next/server';

// English semantic mapping for Chinese tags to prevent multi-lingual leakage
const TAG_EN_MAP: Record<string, string> = {
  '服务好': 'friendly and welcoming staff',
  '出餐快': 'super fast turnaround even during rush hour',
  '环境干净': 'clean and comfortable seating atmosphere',
  '饮品颜值高': 'gorgeous and photo-worthy drink presentation',
  '口味独特': 'rich tea flavor with perfectly balanced sweetness',
};

// 1. Core Strict System Prompts
const GOOGLE_SYSTEM_PROMPT = `You are a genuine local foodie living in San Jose, California (Bay Area).
CRITICAL RULES:
1. You must output ONLY in natural, fluent American English.
2. NEVER output any Chinese characters under any circumstances. If the context contains Chinese, translate the concept into natural English.
3. Tone: Authentic, relaxed, objective, like a Google Local Guide (not robotic marketing buzzwords).
4. Length & Structure: Keep it strictly under 75 words. Format the review into 2 to 3 short paragraphs with a blank line between each for effortless mobile reading.
5. Output ONLY the raw plain text review without quotation marks, markdown headings, or commentary.`;

const XHS_SYSTEM_PROMPT = `你是一位常驻美国加州湾区（圣何塞 San Jose）的小红书资深探店博主。
核心排版与风格规范：
1. 爆款标题：1行，必须带有 Emoji 和地点（如：🧋在San Jose挖到了宝藏神仙奶茶！✨）。
2. 正文呼吸感排版：3-4个短段落，每句话必须换行留出空行，绝不能堆叠大段文字。
3. 穿插灵动Emoji（🧋✨🍵💖🔥），语气热情、网络化、闺蜜安利感。
4. 结尾附带3个相关话题标签（如：#奶茶推荐 #圣何塞美食 #湾区探店）。
5. 直接输出纯文本内容，不要输出Markdown代码块。`;

// 2. Intelligent Pure-English & Pure-Chinese Fallbacks
function getLocalFallback(platform: string, tags: string[]): string {
  if (platform === 'Google') {
    const enTags = tags
      .map((t) => TAG_EN_MAP[t] || 'great drinks and fast service')
      .join(', ');
    return `Sunny Tea House in San Jose is hands down one of my favorite boba spots in the South Bay!\n\nThe ${enTags} really made my visit memorable. The boba texture was super chewy and fresh, and the sweetness level was spot on.\n\nDefinitely my new go-to place whenever I'm in San Jose!`;
  } else {
    return `🧋在San Jose挖到宝藏奶茶店啦！Sunny Tea House亲测不踩雷✨\n\n店员真的超级热情，${tags.join('、') || '服务好、出餐快'}！\n\n奶茶口感醇厚，珍珠Q弹软糯，甜度刚刚好～\n\n拍照打卡巨出片，湾区的宝子们快冲！\n\n#奶茶推荐 #圣何塞美食 #湾区探店`;
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
    const { platform = '小红书', tags = [] } = await req.json();

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

    const userPrompt =
      platform === 'Google'
        ? `Customer experience highlights: ${englishTags || 'great boba and friendly service'}. Write the short Google review in English now.`
        : `顾客本次打卡 Sunny Tea House 体验标签：${tags.join('、') || '服务好、出餐快'}。请写小红书种草笔记。`;

    // Smart summaries for bonus question
    const tagSummaryStr = tags.length > 0 ? tags.join('、') : '服务好、出餐快';
    const bonusSummary = `顾客赞赏了${tagSummaryStr}，整体体验优秀。`;
    const bonusReplyDraft = `亲爱的顾客，感谢您对 Sunny Tea House 的喜爱与支持，期待再次为您制作美味饮品！`;

    if (!apiKey) {
      const fallbackText = getLocalFallback(platform, tags);
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
          temperature: platform === 'Google' ? 0.65 : 0.85,
        }),
      });

      if (!response.ok) {
        throw new Error(`Upstream AI Error: ${response.statusText}`);
      }

      const data = await response.json();
      let reviewText =
        data.choices?.[0]?.message?.content?.trim() ||
        getLocalFallback(platform, tags);

      // Post-processing guard: If Google output somehow still contains Chinese, replace with clean fallback
      if (platform === 'Google' && /[\u4e00-\u9fa5]/.test(reviewText)) {
        reviewText = getLocalFallback('Google', tags);
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
      const fallbackText = getLocalFallback(platform, tags);
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
