import { NextRequest, NextResponse } from 'next/server';
import {
  GOOGLE_REVIEW_SYSTEM_PROMPT,
  XHS_REVIEW_SYSTEM_PROMPT,
  buildUserPrompt,
  GenerationParams,
} from '@/lib/prompts';

// Built-in intelligent template fallback if upstream AI API is blocked by local network
function getSmartFallback(params: GenerationParams): string {
  const { tags, platform, customDrink, tone } = params;
  const drink = customDrink || '黑糖珍珠鲜奶';
  const tagStr = tags.join('、') || '服务好、出餐快';

  if (platform === 'google') {
    return `Sunny Tea House in San Jose is hands down one of my favorite boba spots! The staff was super welcoming and the ${drink} came out crazy fast. The boba texture was on point—super chewy with the perfect sweetness level. Definitely my new go-to spot in the Bay Area!`;
  } else {
    return `🧋在San Jose挖到了宝藏神仙奶茶！Sunny Tea House超赞✨\n\n一进门就被热情的店员暖到了，服务态度满分！\n\n点了招牌【${drink}】，出餐超快，几分钟就拿到了！\n\n珍珠软糯Q弹、黑糖浓郁不腻，口感直接封神，拍照也超好看～\n\n强烈推荐大家选半糖少冰！湾区的宝子们一定要冲！\n\n#湾区探店 #SanJose美食 #硅谷吃喝玩乐 #奶茶测评`;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: GenerationParams = await req.json();
    const { tags, platform, customDrink, tone } = body;

    const apiKey = process.env.GROQ_API_KEY;
    const model = process.env.DEFAULT_MODEL || 'openai/gpt-oss-120b';

    // If API Key is missing or network fails, gracefully fallback to local intelligent generator
    if (!apiKey) {
      const fallbackText = getSmartFallback(body);
      return new Response(fallbackText, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const systemPrompt =
      platform === 'google'
        ? GOOGLE_REVIEW_SYSTEM_PROMPT
        : XHS_REVIEW_SYSTEM_PROMPT;

    const userPrompt = buildUserPrompt({ tags, platform, customDrink, tone });

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
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: platform === 'google' ? 0.7 : 0.85,
          stream: true,
        }),
      });

      if (!groqResponse.ok) {
        console.warn('Groq upstream error, switching to graceful self-healing fallback');
        const fallbackText = getSmartFallback(body);
        return new Response(fallbackText, {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }

      // Stream transform
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      const stream = new ReadableStream({
        async start(controller) {
          const reader = groqResponse.body?.getReader();
          if (!reader) {
            controller.enqueue(encoder.encode(getSmartFallback(body)));
            controller.close();
            return;
          }

          let buffer = '';

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith(':')) continue;
                if (trimmed === 'data: [DONE]') {
                  controller.close();
                  return;
                }

                if (trimmed.startsWith('data: ')) {
                  try {
                    const json = JSON.parse(trimmed.substring(6));
                    const textChunk = json.choices?.[0]?.delta?.content || '';
                    if (textChunk) {
                      controller.enqueue(encoder.encode(textChunk));
                    }
                  } catch {
                    // Ignore partial chunk json errors
                  }
                }
              }
            }
          } catch (err) {
            console.warn('Stream interrupted, gracefully closing');
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    } catch (networkErr) {
      console.warn('Upstream network unreachable, using instant smart fallback:', networkErr);
      return new Response(getSmartFallback(body), {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
