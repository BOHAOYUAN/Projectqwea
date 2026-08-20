import { NextRequest, NextResponse } from 'next/server';
import { WECOM_SUMMARY_REPLY_PROMPT } from '@/lib/prompts';

export async function POST(req: NextRequest) {
  try {
    const { reviewText, platform, tags, webhookUrl } = await req.json();

    if (!reviewText) {
      return NextResponse.json({ error: 'Review text is required' }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Groq API Key missing on server' }, { status: 500 });
    }

    const model = process.env.DEFAULT_MODEL || 'openai/gpt-oss-120b';

    // 1. Call AI to extract Chinese summary and draft merchant reply
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

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      console.error('Groq webhook AI error:', errText);
      throw new Error(`AI summarization failed: ${errText}`);
    }

    const groqData = await groqResponse.json();
    const parsed = JSON.parse(groqData.choices?.[0]?.message?.content || '{}');

    const summary = parsed.summary || '顾客对饮品口感与服务效率给予了高度赞赏。';
    const sentiment = parsed.sentiment || '正向好评 (5星)';
    const merchantReply = parsed.merchantReply || '非常感谢您对 Sunny Tea House 的喜爱！期待很快能再次为您制作美味饮品！';

    // 2. Build Enterprise WeChat (WeCom) Markdown Message
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

    // 3. If real webhook is provided and not demo mock, send actual HTTP POST
    if (targetWebhook && !targetWebhook.includes('demo-key-12345')) {
      try {
        const pushRes = await fetch(targetWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(wecomMarkdown),
        });
        wecomResponse = await pushRes.json();
        pushStatus = wecomResponse.errcode === 0 ? 'sent' : 'failed';
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Push failed';
        console.warn('Webhook push error:', errMsg);
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
    console.error('Webhook route error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
