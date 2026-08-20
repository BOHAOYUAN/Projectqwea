import { NextRequest, NextResponse } from 'next/server';

// 1. Core System Prompts for Google & Xiaohongshu
const GOOGLE_SYSTEM_PROMPT = `你是一个北美本地生活家，请用英文生成客观、冷静、真实的评价，语气像普通消费者，不超过80个单词，不要用夸张营销词汇。请直接返回纯文本评论，不要包含Markdown代码块或解释。`;

const XHS_SYSTEM_PROMPT = `你是一个小红书资深种草博主，请用中文生成爆款种草笔记。必须包含适当的Emoji（如🧋✨🍵），每句话必须换行留出呼吸感，结尾带上3个相关话题标签（如#奶茶推荐 #圣何塞美食 #湾区探店），语气要热情、网络化。请直接返回纯文本，不要包含Markdown代码块或解释。`;

// 2. Intelligent local fallback if network is unreachable
function getLocalFallback(platform: string, tags: string[]): string {
  const tagList = tags.length > 0 ? tags.join(', ') : 'great drinks & friendly staff';
  if (platform === 'Google') {
    return `Sunny Tea House in San Jose is a solid spot for boba. The ${tagList} really stood out during my visit. The drinks were well balanced and not overly sweet, and the staff got orders out quickly. Definitely worth stopping by if you're in the area.`;
  } else {
    return `🧋在San Jose挖到宝藏奶茶店啦！Sunny Tea House亲测不踩雷✨\n\n店员真的超级热情，${tags.join('、') || '服务好、出餐快'}！\n\n奶茶口感醇厚，珍珠Q弹软糯，甜度刚刚好～\n\n拍照打卡巨出片，湾区的宝子们快冲！\n\n#奶茶推荐 #圣何塞美食 #湾区探店`;
  }
}

// 3. Asynchronous Enterprise WeChat Webhook Background Task (Non-blocking)
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
    // Call LLM to extract 20-word summary and 50-word merchant reply
    const summaryPrompt = `请将以下主评论提炼为20字以内的中文摘要，并生成一段给奶茶店老板的回复草稿（50字，亲切感谢口吻）。
主评论内容：${reviewText}
请直接输出纯JSON格式：{"summary": "20字中文摘要", "replyDraft": "50字感谢回复草稿"}`;

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

    let summary = '顾客对饮品与服务给出了积极好评。';
    let replyDraft = '感谢您对Sunny Tea House的喜爱与支持，期待您的再次光临！';

    if (aiRes.ok) {
      const data = await aiRes.json();
      try {
        const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}');
        if (parsed.summary) summary = parsed.summary;
        if (parsed.replyDraft) replyDraft = parsed.replyDraft;
      } catch {
        // Safe fallback if raw text returned
      }
    }

    // Send payload to Enterprise WeChat Bot
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

    // Security: API Key is read ONLY from server environment
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

    const userPrompt =
      platform === 'Google'
        ? `Customer experience tags for Sunny Tea House (San Jose, CA): ${tags.join(', ') || 'friendly staff, fast service'}. Generate the review.`
        : `顾客本次打卡 Sunny Tea House 体验标签：${tags.join('、') || '服务好、出餐快'}。请生成种草笔记。`;

    if (!apiKey) {
      // Return smart local fallback if key not configured
      const fallbackText = getLocalFallback(platform, tags);
      return NextResponse.json({ review: fallbackText, success: true });
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
          temperature: platform === 'Google' ? 0.7 : 0.85,
        }),
      });

      if (!response.ok) {
        throw new Error(`Upstream AI Error: ${response.statusText}`);
      }

      const data = await response.json();
      const reviewText =
        data.choices?.[0]?.message?.content?.trim() ||
        getLocalFallback(platform, tags);

      // Trigger Webhook asynchronously in background (Non-blocking)
      triggerWecomWebhookAsync(reviewText, platform, tags, apiKey, apiUrl, model).catch(
        (err) => console.warn('Background webhook trigger error:', err)
      );

      return NextResponse.json({ review: reviewText, success: true });
    } catch (apiErr) {
      console.warn('API call failed, using graceful fallback:', apiErr);
      const fallbackText = getLocalFallback(platform, tags);
      return NextResponse.json({ review: fallbackText, success: true });
    }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : '服务器内部处理异常';
    return NextResponse.json({ error: errMsg, success: false }, { status: 500 });
  }
}
