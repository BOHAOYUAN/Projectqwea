import { NextRequest, NextResponse } from 'next/server';
import { WECOM_SUMMARY_REPLY_PROMPT } from '@/lib/prompts';

export async function POST(req: NextRequest) {
  try {
    const { reviewText, platform, tags, webhookUrl } = await req.json();

    if (!reviewText) {
      return NextResponse.json({ error: 'Review text is required' }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    const model = process.env.DEFAULT_MODEL || 'openai/gpt-oss-120b';

    let summary = '顾客高度赞赏了饮品软糯口感与店员的极速热情服务。';
    let sentiment = '正向好评 (5星)';
    let merchantReply = '亲爱的顾客，非常感谢您对 Sunny Tea House 的喜爱与支持！期待很快再次为您制作美味饮品！';

    if (apiKey) {
      try {
        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: WECOM_SUMMARY_REPLY_PROMPT },
              {
                role: 'user',
                content: `【平台】：${platform === 'google' ? 'Google Review' : '小红书'}\n【标签】：${tags?.join('、') || '常规好评'}\n【顾客评价内容】：\n${reviewText}`,
              },
            ],
            temperature: 0.3,
            response_format: { type: 'json_object' },
          }),
        });

        if (groqResponse.ok) {
          const groqData = await groqResponse.json();
          const parsed = JSON.parse(groqData.choices?.[0]?.message?.content || '{}');
          if (parsed.summary) summary = parsed.summary;
          if (parsed.sentiment) sentiment = parsed.sentiment;
          if (parsed.merchantReply) merchantReply = parsed.merchantReply;
        }
      } catch (err) {
        console.warn('Webhook AI summarization fallback to default:', err);
      }
    }

    // Build Enterprise WeChat (WeCom) Markdown Message
    const platformLabel = platform === 'google' ? 'Google Reviews' : '小红书种草';
    const targetWebhook = webhookUrl || process.env.WECOM_WEBHOOK_URL;

    const wecomMarkdown = {
      msgtype: 'markdown',
      markdown: {
        content: `### 🧋 Sunny Tea House 新评价提醒
> **来源平台**：<font color="info">${platformLabel}</font>
> **情感倾向**：<font color="warning">${sentiment}</font>
> **关注标签**：<font color="comment">${tags?.join(' / ') || '顾客自发好评'}</font>

**📝 顾客原评**：
>${reviewText.slice(0, 150)}${reviewText.length > 150 ? '...' : ''}

**📌 AI 核心摘要**：
>${summary}

**💬 建议商家回复草稿 (店长回复)**：
>${merchantReply}

> <font color="comment">⏰ 生成时间：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}</font>`,
      },
    };

    let pushStatus = 'simulated';
    let wecomResponse = null;

    if (targetWebhook && !targetWebhook.includes('demo-key-12345') && !targetWebhook.includes('your_key_here')) {
      try {
        const pushRes = await fetch(targetWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(wecomMarkdown),
        });
        wecomResponse = await pushRes.json();
        pushStatus = wecomResponse.errcode === 0 ? 'sent' : 'failed';
      } catch (err: unknown) {
        pushStatus = 'failed';
      }
    }

    return NextResponse.json({
      success: true,
      summary,
      sentiment,
      merchantReply,
      wecomPayload: wecomMarkdown,
      pushStatus,
      wecomResponse,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown webhook error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
