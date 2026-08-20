import { NextRequest, NextResponse } from 'next/server';
import {
  GOOGLE_REVIEW_SYSTEM_PROMPT,
  XHS_REVIEW_SYSTEM_PROMPT,
  buildUserPrompt,
  GenerationParams,
} from '@/lib/prompts';

export async function POST(req: NextRequest) {
  try {
    const body: GenerationParams = await req.json();
    const { tags, platform, customDrink, tone } = body;

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Groq API Key is not configured on server.' },
        { status: 500 }
      );
    }

    const systemPrompt =
      platform === 'google'
        ? GOOGLE_REVIEW_SYSTEM_PROMPT
        : XHS_REVIEW_SYSTEM_PROMPT;

    const userPrompt = buildUserPrompt({ tags, platform, customDrink, tone });
    const model = process.env.DEFAULT_MODEL || 'openai/gpt-oss-120b';

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
      const errText = await groqResponse.text();
      console.error('Groq API error:', errText);
      return NextResponse.json(
        { error: `Upstream AI provider error: ${errText}` },
        { status: groqResponse.status }
      );
    }

    // Set up SSE Stream transform to client
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = groqResponse.body?.getReader();
        if (!reader) {
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
                  // Ignore JSON parse error on incomplete chunks
                }
              }
            }
          }
        } catch (err) {
          controller.error(err);
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown internal error';
    console.error('API /generate error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
