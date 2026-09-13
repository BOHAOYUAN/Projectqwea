export type ReviewPlatform = 'google' | 'xiaohongshu' | 'yelp' | 'instagram';
export const CONTENT_VOICES = ['natural', 'concise', 'warm'] as const;
export type ContentVoice = (typeof CONTENT_VOICES)[number];

export interface ReviewDraftInput {
  platform: ReviewPlatform;
  merchantName: string;
  location: string;
  serviceNames: string[];
  tags: string[];
  experience: string;
  voice?: ContentVoice;
  seed?: number;
  avoidPhrases?: string[];
  socialHandles?: {
    instagram?: string;
    xiaohongshu?: string;
  };
}

export interface GeneratedDraft {
  content: string;
  mode: 'local' | 'groq' | 'deepseek';
  platform: ReviewPlatform;
  fallbackValidated?: boolean;
}

function pick<T>(items: readonly T[], seed: number): T {
  return items[Math.abs(seed) % items.length];
}

function sentenceCase(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function formatList(items: string[], conjunction: 'and' | '和'): string {
  const cleanItems = items.map(sentenceCase).filter(Boolean);
  if (cleanItems.length === 0) return '';
  if (cleanItems.length === 1) return cleanItems[0];
  if (cleanItems.length === 2) return `${cleanItems[0]} ${conjunction} ${cleanItems[1]}`;
  return `${cleanItems.slice(0, -1).join(', ')}, ${conjunction} ${cleanItems.at(-1)}`;
}

function isChinesePlatform(platform: ReviewPlatform): boolean {
  return platform === 'xiaohongshu';
}

function localGoogleDraft(input: ReviewDraftInput): string {
  const service = formatList(input.serviceNames, 'and') || 'an appointment';
  const experience = (sentenceCase(input.experience) || input.tags.join(', ')).replace(/[.!?]+$/, '');
  const seed = input.seed ?? Date.now();
  const hasCriticalNote = /average|ordinary|not (?:good|great|impressed|satisfied)|disappoint|underwhelm|mixed/i.test(experience);
  if (hasCriticalNote) {
    return pick([
      `I booked ${service} at ${input.merchantName} in ${input.location}. ${experience}. My overall impression stayed mixed rather than clearly positive. I appreciated the good part I mentioned, while the rest of the visit did not stand out to me. That balance is the most honest way I can describe the appointment. Nothing felt especially memorable, though the positive detail was still worth noting.`,
      `${input.merchantName} in ${input.location} was where I tried ${service}. ${experience}. I came away with an average overall impression, even though one part of the visit was positive. I do not want that good detail to get lost, but it also did not change how ordinary the appointment felt as a whole. Both sides are part of my experience, so I am mentioning them together.`,
      `I went to ${input.merchantName} in ${input.location} for ${service}. ${experience}. The visit felt ordinary overall, with one positive detail that I genuinely noticed. I appreciated that part without feeling that it changed the rest of the experience. My reaction is still mixed, and this is the clearest way to describe what stood out and what did not.`,
      `My visit to ${input.merchantName} in ${input.location} was for ${service}. ${experience}. The good part was noticeable, but my overall reaction remained average. I would rather keep both impressions in the same review than let one erase the other. The appointment was not entirely negative, though it also did not give me much else to remember afterward.`,
      `At ${input.merchantName} in ${input.location}, I tried ${service}. ${experience}. I appreciated the positive part of that experience, while the appointment as a whole still felt ordinary to me. It was a mixed visit, not an especially good or bad one. The balance between those two impressions is what I remember most clearly now.`,
      `I chose ${service} at ${input.merchantName} in ${input.location}. ${experience}. One part of the visit went well, and that deserves to be mentioned. Even so, my overall impression was still average. I did not come away particularly disappointed or impressed, so the visit still sits somewhere in the middle for me.`,
      `${experience}. That is how I would sum up my visit to ${input.merchantName} in ${input.location}, where I booked ${service}. I noticed the positive detail, but the rest of the appointment felt fairly ordinary. It was enough to keep the experience from feeling completely negative, though not enough to change my average overall impression.`,
    ], seed);
  }
  return pick([
    `I went to ${input.merchantName} in ${input.location} for ${service}. ${experience}. The visit gave me room to pay attention to how I actually felt instead of rushing on to the next thing. What stayed with me afterward was the simple sense that the time had been well spent. It was an easy experience to describe because those details were the parts that genuinely stood out to me.`,
    `${input.merchantName} was where I booked ${service} during my visit to ${input.location}. ${experience}. I noticed those things without having to think too hard about them, which made the appointment feel straightforward and comfortable. By the time I left, that was still the clearest impression I had. It felt worth taking a moment to write down while the visit was still fresh.`,
    `I booked ${service} at ${input.merchantName} in ${input.location}. ${experience}. That combination is what I remember most clearly from the appointment. The experience felt easy to settle into, and I appreciated being able to take the visit at face value. When I thought about it later, the same details came back first, so they are the most honest way for me to describe it.`,
  ], seed);
}

function localYelpDraft(input: ReviewDraftInput): string {
  const service = formatList(input.serviceNames, 'and') || 'an appointment';
  const experience = (sentenceCase(input.experience) || input.tags.join(', ')).replace(/[.!?]+$/, '');
  const seed = (input.seed ?? Date.now()) + 11;
  const hasCriticalNote = /average|ordinary|not (?:good|great|impressed|satisfied)|disappoint|underwhelm|mixed/i.test(experience);
  if (hasCriticalNote) {
    return pick([
      `I visited ${input.merchantName} in ${input.location} for ${service}. ${experience}. My reaction afterward was mixed. The positive part I mentioned was noticeable and worth giving credit for, but the visit as a whole still felt average to me. I did not leave with a strong negative impression, yet there was not much else that stood out either. The most accurate summary is that one part went well while the overall experience remained fairly ordinary.`,
      `For this visit to ${input.merchantName}, I booked ${service}. ${experience}. I appreciated the good detail in that experience, although it did not change my broader impression of the appointment. Overall, it felt ordinary rather than especially memorable. I think it is fair to mention both sides instead of turning one positive moment into praise for the entire visit. That balance is what stayed with me when I thought about the appointment later.`,
      `${input.merchantName} in ${input.location} was where I tried ${service}. ${experience}. There was a positive part to the visit, and I noticed it, but the rest of the appointment did not leave much of an impression. I would describe the overall experience as average. It was not a completely negative visit, and I do not want to overlook what went well, yet the good detail was not enough to make the whole appointment feel distinctive.`,
    ], seed);
  }
  return pick([
    `I visited ${input.merchantName} in ${input.location} for ${service}. ${experience}. I had enough time during the appointment to notice what felt different instead of moving through it on autopilot. The details that stayed with me were small but clear, and they shaped the whole visit for me. Looking back, the experience felt consistent with what I had hoped for when I booked the service, and I left with a calm, straightforward impression of the appointment. Those were the points that genuinely stayed with me.`,
    `For this visit to ${input.merchantName}, I booked ${service}. ${experience}. Those parts of the appointment stood out naturally and did not need much embellishment. I found myself thinking about them again later because they made the visit feel easy to remember. The experience in ${input.location} was simple in a good way: I knew what I had come in for, had the time to take it in, and left with a clear sense of the visit. Those are the details I would keep in mind.`,
    `${input.merchantName} in ${input.location} was where I tried ${service}. ${experience}. What I liked most was being able to notice those details as the visit unfolded rather than only thinking about them afterward. They made the appointment feel settled and gave me a clear takeaway from the time I spent there. It was the kind of experience that was easy to remember later for a few specific, personal reasons. Those are still the details I would remember from it.`,
  ], seed);
}

function hashtag(value: string): string {
  const compact = value.replace(/[^\p{L}\p{N}]/gu, '');
  return compact ? `#${compact.slice(0, 48)}` : '';
}

function localInstagramDraft(input: ReviewDraftInput): string {
  const typedExperience = sentenceCase(input.experience);
  const service = formatList(input.serviceNames, 'and');
  const tagList = input.tags.join(', ');
  const note = (typedExperience || tagList).replace(/[.!?。！？]+$/, '');
  const seed = input.seed ?? Date.now();

  const mention = input.socialHandles?.instagram
    ? ` @${input.socialHandles.instagram.replace(/^@/, '')}`
    : '';

  const hashtags = [
    hashtag(input.merchantName),
    hashtag(service),
    hashtag(input.location),
    ...input.tags.map(hashtag),
    hashtag(`${input.merchantName}Visit`),
    hashtag(`${input.location}Visit`),
  ].filter(Boolean).slice(0, 10).join(' ');

  const hasCriticalNote = /average|ordinary|not (?:good|great|impressed|satisfied)|disappoint|underwhelm|mixed/i.test(typedExperience);
  if (hasCriticalNote) {
    return pick([
      `${input.merchantName}${mention}\n\nI came in for ${service}. ${note}. That left me with a mixed impression: the overall visit did not stand out, while the positive part I mentioned was still worth noting. Both things can be true, and that is the most accurate way to describe this visit in ${input.location}.\n\n${hashtags}`,
      `An honest note from ${input.merchantName}${mention}\n\nI booked ${service}. ${note}. My overall impression was ordinary, even though the good part of the visit still mattered to me. The positive interaction was part of the experience, but it did not make the place feel more than average to me. That balance is what I remember.\n\n${hashtags}`,
      `${service} at ${input.merchantName}${mention}\n\n${note}. The visit felt mixed rather than amazing. I appreciated the positive detail I mentioned, but it did not change my broader impression of the place. Looking back, the good part and the average overall feeling are both still clear to me.\n\n${hashtags}`,
      `A mixed visit at ${input.merchantName}${mention}\n\nI came in for ${service}. ${note}. One part of the experience was genuinely positive, but the place still felt average overall. I can appreciate that detail without making the rest sound better than it felt. That is the simple version of my visit in ${input.location}.\n\n${hashtags}`,
      `${input.merchantName}${mention}, honestly\n\nI booked ${service}. ${note}. I noticed the positive part and appreciated it, while my overall reaction stayed ordinary. The visit was not all bad, but it also did not give me much else to remember. Both impressions belong in the same note.\n\n${hashtags}`,
      `A straightforward note on ${input.merchantName}${mention}\n\n${note}. I was there for ${service}, and my reaction stayed mixed after I left. I appreciated the one good part without reading more into the rest of the visit. Overall, it still felt average to me, so that is where I would leave it.\n\n${hashtags}`,
      `What stood out at ${input.merchantName}${mention}\n\nI tried ${service}. ${note}. The positive detail was real, but so was the ordinary overall feeling. Neither one cancels out the other. Looking back on the visit in ${input.location}, that combination is still the clearest impression I have.\n\n${hashtags}`,
    ], seed);
  }

  return pick([
    `${input.merchantName}${mention} ✨\n\nI stopped in for ${service}, and this is what stayed with me afterward: ${note}. It was nice to give the visit its own space instead of rushing through the moment. A simple pause in ${input.location}, and one I was glad I made time for. 🤍\n\n${hashtags}`,
    `A little time at ${input.merchantName}${mention} 💆\n\nI booked ${service}. ${note}. Those were the details I noticed most, and they made the visit easy to remember later. Sometimes a straightforward appointment is exactly enough. This one in ${input.location} left a clear impression without needing a big story around it. ✨\n\n${hashtags}`,
    `${service} at ${input.merchantName}${mention} 🤍\n\n${note}. That was the part of the visit that stayed in my mind afterward. I liked being able to slow the moment down and simply notice how it felt. A small piece of my day in ${input.location}, but one that was worth remembering. ✨\n\n${hashtags}`,
    `After work at ${input.merchantName}${mention} ✨\n\nI made time for ${service}. ${note}. The calm pace was what I noticed most, and it stayed with me after I headed home. Nothing dramatic, just a visit that gave the day a quieter ending and felt easy to remember later. 🤍\n\n${hashtags}`,
    `${input.merchantName}${mention}, one small pause in the day 💆\n\nI came in for ${service}. ${note}. Once I had time to settle, the rest of the day felt less hurried. That simple change in pace is what I remember from the visit in ${input.location}. ✨\n\n${hashtags}`,
    `A calm part of the day at ${input.merchantName}${mention} 🤍\n\nI chose ${service}. ${note}. The visit gave me a little room to slow down and notice the moment as it was happening. That quieter pace is the part I carried with me afterward in ${input.location}. ✨\n\n${hashtags}`,
    `${input.merchantName}${mention} after a busy day ✨\n\nI stopped in for ${service}. ${note}. What mattered most was the chance to pause without turning it into a big occasion. It was a simple visit in ${input.location}, and the details I mentioned are what made it feel personal to me. 🤍\n\n${hashtags}`,
  ], seed);
}

function localXiaohongshuDraft(input: ReviewDraftInput): string {
  const service = formatList(input.serviceNames, '和');
  const note = sentenceCase(input.experience).replace(/[。！？!?]+$/, '');
  const seed = input.seed ?? Date.now();
  const location = input.location.replace(/Baltimore(?:,\s*MD)?/i, '巴尔的摩');
  const title = Array.from(pick([
    service ? `${service}随手记` : '今天的小记录',
    '这次想记一下',
    '留给自己的一点感受',
    service ? `${service}之后` : '刚好想写两句',
  ], seed)).slice(0, 24).join('');
  const parts = [
    service ? `在${location}的 ${input.merchantName} 做了${service}，简单记一下这次感受。` : `记一下${input.merchantName}这次体验。`,
    note ? `${note}。` : '',
    ...input.tags.map(localXiaohongshuFeeling).filter(Boolean).filter((sentence) => !note.includes(sentence.replace(/[。！？!?]+$/, ''))).slice(0, 2),
  ].filter(Boolean);
  const tagList = Array.from(new Set([
    hashtag(input.merchantName),
    hashtag(location),
    hashtag(service),
    ...input.tags.map(hashtag),
  ].filter(Boolean))).slice(0, 5).join(' ');

  return `${title}\n\n${parts.join('')}\n\n${tagList}`;
}

function localXiaohongshuFeeling(tag: string): string {
  const copy: Record<string, string> = {
    '肩颈松了': '肩颈确实松了一点。',
    '终于慢下来': '整个人也慢下来一些。',
    '没有推销': '没有被推销，这点很舒服。',
    '值得再来': '这次的感受让我愿意记住。',
    '放松舒服': '整体是放松舒服的。',
    '细心专业': '细致和专业这点有被感受到。',
    '环境整洁': '环境看着很整洁。',
    '节奏不赶': '节奏不赶，人会轻松些。',
  };
  return copy[tag] ?? '';
}

function buildSystemPrompt(input: ReviewDraftInput): string {
  const variationKey = Math.abs(input.seed ?? Date.now()).toString(36);
  const variationDirection = pick([
    'Structure A: begin with the customer’s own observation; name the service only in the second sentence; end on that observation without a recommendation.',
    'Structure B: begin with what was selected; use one short contrast in the middle; end with a plain present-tense feeling, not a future-visit statement.',
    'Structure C: begin in the middle of the visit with a concrete fact from the customer note; then give the service context; finish abruptly and simply.',
    'Structure D: write a compact first-person reflection in chronological order—choice, observation, takeaway—with a short final sentence.',
    'Structure E: use two uneven paragraphs. Start with an understated reaction, put the service name later, and do not end with “I’ll be back” language.',
    'Structure F: write a direct, diary-like note with a short first sentence and a longer second paragraph. Do not use a recommendation-style ending.',
    'Structure G: start with one exact idea from the customer note in fresh wording, then connect it to the selected service; end on a neutral detail.',
    'Structure H: start with the reason for the visit, use varied sentence length, and finish with the customer’s stated feeling rather than a call to action.',
  ], input.seed ?? Date.now());
  const priorPhraseRule = input.avoidPhrases?.length
    ? `Do not reuse or lightly rephrase any of these previous opening or closing fragments: ${input.avoidPhrases.map((value) => `“${value}”`).join('; ')}.`
    : 'No earlier draft fragments are supplied.';
  const editorialPrinciples = `EDITORIAL METHOD:
- Treat the customer note as the primary source of voice and detail. Preserve its concrete observation rather than replacing it with generic praise.
- Selected services and tags are supporting facts, not an instruction to invent a full story for each one. If the note does not describe a service detail, do not make one up.
- The customer's own note outranks selected tags. Preserve criticism, mixed feelings, and ordinary wording exactly in meaning; never turn an average or negative visit into praise. If a tag conflicts with the note, omit the tag rather than soften the note.
- When two or more services are selected, mention every selected service once in a compact, natural way where the platform format permits. Do not attach an invented result or detail to any of them.
- Never expose the app's mechanics in the writing: do not say “I selected,” “the details I chose,” “this review is based on,” “I am keeping this focused,” or explain that facts were omitted. Those are instructions for the model, not words a customer would post.
- Do not turn a tag into a list. Weave at most one or two selected feelings into ordinary first-person sentences; leave a feeling out rather than inventing an event to support it.
- Do not use ratings language, sales language, calls to action, recommendations, or a business-owner voice.
- Avoid filler, symmetry, and list-like wording. Use varied sentence length, mild imperfection, and a specific first-person rhythm that sounds like one person wrote it after one visit.
- This is a one-use revision identified internally as ${variationKey}. Make its opening, sentence order, and closing meaningfully distinct from a generic version of the same input. Never print this identifier.
- ${priorPhraseRule}
- Before answering, silently check: correct language; merchant name present; no fabricated facts; no prohibited wording; every requested formatting rule is met. Then output only the finished draft.`;
  const voiceDesc = input.voice === 'concise'
    ? 'Keep it direct, focused, and unhurried.'
    : input.voice === 'warm'
      ? 'Use a warm, appreciative, relaxing and heartfelt tone.'
      : 'Use an authentic, conversational, everyday customer tone.';
  const xhsVoiceGuide = input.voice === 'concise'
    ? '短句直说：像聊天时顺手发的一条记录，正文 2–5 句，不强行加 emoji。'
    : input.voice === 'warm'
      ? '松弛日记：多一点当下的主观感受，句子可以有长有短，最多用 2 个贴合语气的 emoji。'
      : '随手记录：像发给朋友看的日常分享，口语自然，最多用 1 个贴合语气的 emoji。';
  const xhsVariationDirection = pick([
    '从一个最具体的感受开头，门店和项目放进后面的句子。',
    '开头先写项目，第二句只写一个最有感的变化。',
    '用两段不等长的文字，第一段有情绪，第二段收在一个简单反应上。',
    '像聊天一样直接写，开头不要使用“今天”“最近”“这次体验”。',
    '标题短一点，正文不要总结全部标签，只挑一两个最有感觉的点。',
  ], input.seed ?? Date.now());
  const xhsPriorPhraseRule = input.avoidPhrases?.length
    ? `上一版已经用过这些开头或结尾片段：${input.avoidPhrases.map((value) => `“${value}”`).join('、')}。这版换一个切入和收尾，不要复用或近似改写它们。`
    : '没有上一版可避开。';
  const xhsStyleReference = pick([
    '素材：面部 SPA；肩颈松了一点。示例节奏：“脖子总算没那么顶着了。做完面部 SPA 才发现肩颈也跟着松了一点，细小但能感觉到。”',
    '素材：没有推销；节奏不赶。示例节奏：“不用一边做一边想着怎么拒绝套餐，这点对我很重要。人一放松，整段时间都顺下来了。”',
    '素材：整体一般；服务员不错。示例节奏：“没有到让我惊艳的程度，但服务员沟通得挺舒服。优点和感受都记一下。”',
    '素材：头疗；终于慢下来。示例节奏：“脑子终于没有那么吵了。头疗做完不是什么大变化，就是人没那么赶。”',
  ], input.seed ?? Date.now());

  const igMentionRule = input.socialHandles?.instagram
    ? `Naturally mention @${input.socialHandles.instagram.replace(/^@/, '')} in the caption.`
    : 'Do not invent any social media handles.';

  const xhsAccountRule = input.socialHandles?.xiaohongshu
    ? `正文只写门店名“${input.merchantName}”，不要输出 @ 账号。发布页会另行提示顾客手动选择官方账号“${input.socialHandles.xiaohongshu}”。`
    : `正文只写门店名“${input.merchantName}”，不要输出或虚构 @ 账号。`;

  if (input.platform === 'google') {
    return `You are a genuine customer writing a Google review for "${input.merchantName}" in ${input.location}.
STRICT FORMAT & COMPLIANCE RULES:
${editorialPrinciples}
1. Language: English only.
2. Length: Exactly 60–120 words.
3. Format: Pure plain text in 1–2 paragraphs. NO title, NO hashtags, NO emojis.
4. Voice: ${voiceDesc} Authentic, grounded, no marketing fluff or AI cliches.
5. Content: Mention "${input.merchantName}" naturally. Use ONLY the selected services, selected feelings, and customer note supplied in the user message. Do not infer or add staff, cleanliness, check-in, timing, atmosphere, results, or any other detail.
6. Guardrails: No extreme claims (e.g. "the best in the world", "#1"), no mention of discounts, promotions, incentives, ratings, or review exchanges.
7. Variation direction for this draft: ${variationDirection}
8. Do not use stock phrases including "great experience", "highly recommend", "look forward to coming back", "from start to finish", or "the staff was".
9. Output ONLY the review text.`;
  }

  if (input.platform === 'yelp') {
    return `You are a genuine customer writing a detailed Yelp review for "${input.merchantName}" in ${input.location}.
STRICT FORMAT & COMPLIANCE RULES:
${editorialPrinciples}
1. Language: English only.
2. Length: Exactly 80–150 words (more detailed and descriptive than Google).
3. Format: Pure plain text in 1–2 paragraphs. NO title, NO hashtags.
4. Voice: ${voiceDesc} Balanced and observational; do not add any setting, check-in, cleanliness, staff, or treatment detail unless it appears literally in the supplied facts.
5. Content: Only mention selected services, selected tags, and the customer's own note. Mention "${input.merchantName}".
6. Guardrails: No hyperbolic words ("best ever", "perfection"), no mention of discounts/exchanges, ratings, or review incentives.
7. Variation direction for this draft: ${variationDirection}
8. Do not use stock phrases including "great experience", "highly recommend", "look forward to coming back", "from start to finish", or "the staff was".
9. Output ONLY the review text.`;
  }

  if (input.platform === 'instagram') {
    return `You are posting an aesthetic Instagram caption after visiting "${input.merchantName}" in ${input.location}.
STRICT FORMAT & COMPLIANCE RULES:
${editorialPrinciples}
1. Language: English.
2. Length: Exactly 50–100 words.
3. Format: Segmented lines with subtle emojis (✨, 💆, 🤍). ${igMentionRule}
4. Hashtags: End with 5–10 hashtags. They may use only the merchant name, location, selected services, and selected feelings; do not add unselected claims.
5. Content: Use only the supplied facts. Never invent the setting, staff, outcome, or a before/after result.
6. Variation direction for this draft: ${variationDirection}
7. Avoid reusable influencer filler such as "my new sanctuary", "much needed reset", or "this is your sign".
8. Before answering, count the non-hashtag English words and the final hashtags. Return 50–100 non-hashtag words followed by exactly 5–10 final hashtags.
9. Output ONLY the caption.`;
  }

  return `你是一位普通顾客，正在为「${input.merchantName}」写一篇中文小红书体验笔记。

把它写得像一个人刚刚记下的感受，不要像商家介绍、测评报告或 AI 总结。

写作规则：
1. 顾客原话、已选项目和已选感受是事实来源。可以把已有感受写得更有情绪、更口语，但不要虚构到店原因、时间、环境、技师、流程、价格或效果等具体经历。信息少就写短一点。
2. 顾客原话优先。原话里有“一般”“不满意”或褒贬并存时，如实保留，用个人感受来表达，不要改成夸赞或推荐。
3. 每篇只抓 1–2 个最有感觉的点，不要把项目和标签逐项复述，也不要把同一个感受换词说三遍。
4. 口吻要求：${xhsVoiceGuide}
5. 本篇写法方向：${xhsVariationDirection}
6. 第一行写简短标题，正文 1–3 段，文末放 2–6 个和输入有关的话题。正文自然出现门店名「${input.merchantName}」。${xhsAccountRule}
7. 不要写极限词、返现折扣、疗效承诺、评分或引导他人消费的话术；避免“整体而言”“不仅如此”“值得一提”“体验感拉满”“不是那种很夸张的变化”等模板句。
8. ${xhsPriorPhraseRule}

参考这种表达节奏，不要照抄措辞：
${xhsStyleReference}

只输出最终成稿，不解释规则或过程。`;
}

type CompatibleChatProvider = {
  endpoint: string;
  apiKey: string;
  model: string;
  nonThinking?: boolean;
};

async function requestCompatibleChat(
  provider: CompatibleChatProvider,
  system: string,
  user: string,
  temperature: number,
  maxTokens: number,
): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4_500);

    const response = await fetch(provider.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: provider.model,
        temperature,
        max_tokens: maxTokens,
        ...(provider.nonThinking ? { thinking: { type: 'disabled' } } : {}),
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });

    clearTimeout(timeoutId);
    if (!response.ok) return null;
    const data = (await response.json()) as {
      choices?: Array<{ finish_reason?: string | null; message?: { content?: string } }>;
    };
    const choice = data.choices?.[0];
    if (choice?.finish_reason === 'length') return null;
    const content = choice?.message?.content?.trim();
    return content || null;
  } catch {
    return null;
  }
}

async function generateWithRemoteProvider(input: ReviewDraftInput, provider: CompatibleChatProvider): Promise<string | null> {
  const system = buildSystemPrompt(input);
  const services = input.serviceNames.join(', ') || 'None selected';
  const tags = input.tags.join(', ') || 'None selected';

  const user = isChinesePlatform(input.platform)
    ? `门店：${input.merchantName}（${input.location}）\n已选项目：${services}\n已选感受：${tags}${input.experience ? `\n顾客原话：${input.experience}` : ''}\n\n请围绕这些内容写一篇自然的小红书笔记。顾客原话优先，没有原话时就根据已选项目和感受写，不要硬凑场景。`
    : `Store: ${input.merchantName} in ${input.location}\nSelected services: ${services}\nSelected feelings: ${tags}${input.experience ? `\nCustomer note: ${input.experience}` : ''}\n\nUse only the facts above. Do not mention any service, staff, cleanliness, timing, ambiance, outcome, or detail that does not literally appear above. Please write the review:`;

  // The XHS prompt anchors factual details itself; a moderate temperature
  // leaves enough room for an informal, non-formulaic Chinese voice.
  const temperature = input.platform === 'xiaohongshu'
    ? (input.voice === 'concise' ? 0.65 : 0.82)
    : (input.voice === 'concise' ? 0.8 : 0.95);

  // Keep response time predictable on a phone. One initial attempt plus one
  // format-correction attempt is enough for social captions; deterministic,
  // source-bound fallbacks handle provider variance without a long retry tail.
  const attempts = 2;
  let formatFeedback = '';
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const retryRequirement = input.platform === 'instagram'
      ? 'The last caption was invalid. Return 60–85 English non-hashtag words followed by exactly 5–10 end hashtags. Include the exact supplied Instagram handle and no other @ handle. Use only supplied facts; no explanation.'
      : input.platform === 'xiaohongshu'
        ? formatFeedback || '请保留自然口吻，补齐简短标题、正文和文末话题后重新输出成稿，不要解释。'
        : 'The last draft was invalid. Return only a finished draft that satisfies every required length and formatting rule; no explanation.';
    const retrySystem = attempt === 0
      ? system
      : `${system}\n${retryRequirement}`;
    const rawContent = await requestCompatibleChat(
      provider,
      retrySystem,
      user,
      temperature,
      1200,
    );
    if (!rawContent) continue;
    const content = normalizeRemoteDraft(rawContent, input);
    if (!content) continue;

    if (!isChinesePlatform(input.platform) && /[\u4e00-\u9fff]/.test(content)) continue;
    if (isChinesePlatform(input.platform) && !/[\u4e00-\u9fff]/.test(content)) continue;
    if (isGroundedRemoteDraft(content, input)) return content;
    if (input.platform === 'xiaohongshu') formatFeedback = getXiaohongshuFormatFeedback(content, input);
  }

  return null;
}

function getXiaohongshuFormatFeedback(content: string, input: ReviewDraftInput): string {
  const lines = content.split('\n').map((line) => line.trim()).filter(Boolean);
  const title = lines[0] ?? '';
  const body = lines.slice(1).filter((line) => !line.startsWith('#')).join('');
  const chineseCharacters = body.match(/[\u4e00-\u9fff]/g)?.length ?? 0;
  const hashtags = content.match(/#[^\s#]+/g)?.length ?? 0;
  const issues: string[] = [];
  if (Array.from(title).length > 30) issues.push('标题过长');
  if (chineseCharacters < xiaohongshuMinimumBodyLength(input)) issues.push('正文偏短');
  if (chineseCharacters > 360) issues.push('正文过长');
  if (hashtags < 2 || hashtags > 8) issues.push('话题数量不合适');
  return `刚才的成稿${issues.length ? `存在这些问题：${issues.join('；')}` : '格式不完整'}。保持原有的自然表达，只调整这些问题后输出成稿，不要解释。`;
}

function xiaohongshuMinimumBodyLength(input: ReviewDraftInput): number {
  if (input.experience.trim()) return 30;
  const suppliedFacts = input.serviceNames.length + input.tags.length;
  return suppliedFacts <= 1 ? 16 : 26;
}

function normalizeRemoteDraft(content: string, input: ReviewDraftInput): string {
  let normalized = content.replace(/\r\n/g, '\n').trim();
  if (input.platform === 'instagram') {
    const configuredMention = input.socialHandles?.instagram
      ? `@${input.socialHandles.instagram.replace(/^@/, '')}`
      : '';
    normalized = normalized.replace(/@[\w.-]+/gu, '').replace(/[ \t]{2,}/g, ' ').trim();
    if (configuredMention) {
      normalized = normalized.replace(input.merchantName, `${input.merchantName} ${configuredMention}`);
    }
    const allowedHashtags = Array.from(new Set([
      hashtag(input.merchantName),
      ...input.serviceNames.map(hashtag),
      ...input.tags.map(hashtag),
      hashtag(input.location),
    ].filter(Boolean)));

    // When the selected facts provide at least five safe tags, normalize the
    // model's tag tail. This prevents invented tags and removes an otherwise
    // common source of format-retry failures without changing the review body.
    if (allowedHashtags.length >= 5) {
      const body = normalized
        .replace(/(?:^|\s)#[^\s#]+/gu, ' ')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      normalized = `${body}\n\n${allowedHashtags.slice(0, 8).join(' ')}`;
    }
    return normalized;
  }
  if (!isChinesePlatform(input.platform)) return normalized;

  normalized = normalized.replace(/Baltimore(?:,\s*MD)?/gi, '巴尔的摩');

  const lines = normalized.split('\n').map((line) => line.trim()).filter(Boolean);
  const firstLine = lines[0] ?? '';
  // Preserve the model's rhythm. Only add a compact title when it clearly
  // omitted one, rather than recasting the whole draft into a fixed template.
  const hasStandaloneTitle = Array.from(firstLine).length <= 30 && !/[。！？]/.test(firstLine);
  const rawTitle = hasStandaloneTitle ? (lines.shift() ?? '') : '这次想记一下';
  const title = Array.from(rawTitle).slice(0, 30).join('');
  const rawBody = lines
    .filter((line) => !line.startsWith('#'))
    .join('\n')
    .replace(/@MS\s*BEAUTY(?:（[^）]+）)?/gi, input.merchantName)
    .replace(/(?:^|\s)@[\w.-]+的?/gu, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  // Do not pad with fixed feeling sentences. A short, natural customer note
  // is preferable to a mechanically extended one.
  const bodyLimit = 360;
  const bodyBase = Array.from(rawBody).slice(0, bodyLimit).join('').trim();
  const body = bodyBase;
  const modelTags = uniqueXiaohongshuTags(normalized.match(/#[^\s#]+/g) ?? []);

  if (title && body && modelTags.length >= 2) {
    normalized = `${title}\n\n${body}\n\n${modelTags.slice(0, 5).join(' ')}`;
  }
  return normalized;
}

function uniqueXiaohongshuTags(tags: string[]): string[] {
  const seen = new Set<string>();
  return tags.filter((tag) => {
    const compact = tag.replace(/^#/, '').replace(/[\s\p{P}]/gu, '');
    const similarityKey = compact.replace(/生活|探店|日常|体验|记录/gu, '') || compact;
    if (!similarityKey || seen.has(similarityKey)) return false;
    seen.add(similarityKey);
    return true;
  });
}

function groqProvider(apiKey: string): CompatibleChatProvider {
  return {
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    apiKey,
    model: process.env.GROQ_MODEL || process.env.DEFAULT_MODEL || 'openai/gpt-oss-120b',
  };
}

function deepSeekProvider(apiKey: string): CompatibleChatProvider {
  return {
    endpoint: 'https://api.deepseek.com/chat/completions',
    apiKey,
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    nonThinking: true,
  };
}

function isGroundedRemoteDraft(content: string, input: ReviewDraftInput): boolean {
  if (!content || content.trim().length < 10) return false;

  const alwaysBlocked = [
    /\$\s*\d{3,}/, /\bguarantee[ds]?\b/i, /\bcure[ds]?\b/i, /\bcancer\b/i,
    /\b(best|perfect|number\s*one|#1)\b/i, /\b(great experience|highly recommend|look forward to coming back|from start to finish|my new sanctuary|much needed reset|this is your sign)\b/i,
    /最好|第一|顶级|完美/,
    /包治/, /彻底根除/, /神医/, /百病/, /保修/, /好评返现|好评.*折扣/,
    /I am keeping|this review is based on|selected (?:service|details)|basis for (?:this|my) review|personal perspective/i,
    /我不想把.*写成|只想把.*记下来|我勾选的是|发布前.*核对|按.*真实.*修改|这条笔记记录的是|没有打算延伸成/,
  ];
  if (alwaysBlocked.some((pattern) => pattern.test(content))) return false;
  if (input.platform === 'xiaohongshu' && /@|MSBEAUTY_BALTIMORE/i.test(content)) return false;
  if (!preservesCustomerSentiment(content, input)) return false;
  if (input.platform === 'instagram') {
    const expectedMention = input.socialHandles?.instagram
      ? `@${input.socialHandles.instagram.replace(/^@/, '')}`.toLowerCase()
      : '';
    const mentions = content.match(/@[\w.-]+/g)?.map((mention) => mention.toLowerCase()) ?? [];
    if (expectedMention && !mentions.includes(expectedMention)) return false;
    if (mentions.some((mention) => mention !== expectedMention)) return false;
  }
  if (!content.toLowerCase().includes(input.merchantName.toLowerCase())) return false;

  return hasPlatformAppropriateLength(content, input);
}

function preservesCustomerSentiment(content: string, input: ReviewDraftInput): boolean {
  const source = input.experience.trim();
  if (!source) return true;

  const sourceHasChineseCriticism = /一般|普通|还行|不好|不太好|差|失望|不满意|没惊喜|没有惊喜|贵|太慢|等(?:了|得)?(?:有点|比较|很|太)?久/.test(source);
  if (sourceHasChineseCriticism) {
    if (input.platform === 'xiaohongshu') {
      if (!/一般|普通|中规中矩|平平无奇|还行|不好|不太适合|差|失望|不满意|没(?:有)?(?:太|很)?惊艳|没留下.*印象|贵|慢|等/.test(content)) return false;
    } else if (!/average|ordinary|not\s+(?:good|great|impressed|satisfied)|disappoint|underwhelm|expensive|pricey|slow|wait|mixed/i.test(content)) {
      return false;
    }
  }

  const sourcePraisesStaff = /(?:服务员|员工|工作人员|店员)[^。！？]{0,10}(?:不错|很好|挺好|友好|耐心|专业)/.test(source);
  if (sourcePraisesStaff) {
    if (input.platform === 'xiaohongshu') {
      if (!/(?:服务员|员工|工作人员|店员)[^。！？]{0,16}(?:不错|好|友好|耐心|专业|加分)|沟通[^。！？]{0,12}(?:舒服|顺|好)|态度[^。！？]{0,12}(?:好|不错|舒服)|说话[^。！？]{0,12}(?:舒服|自然)/.test(content)) return false;
    } else if (!/(?:staff|employee|team|server)[^.?!]{0,30}(?:nice|good|friendly|patient|professional|helpful)/i.test(content)) {
      return false;
    }
  }

  const sourcePraisesStaffInEnglish = /(?:staff member|staff|employee|team|server)[^.?!]{0,30}(?:nice|good|friendly|patient|professional|helpful)/i.test(source);
  if (sourcePraisesStaffInEnglish && !/(?:staff member|staff|employee|team|server)[^.?!]{0,40}(?:nice|good|friendly|patient|professional|helpful|positive)/i.test(content)) {
    return false;
  }

  return true;
}

function hasPlatformAppropriateLength(content: string, input: ReviewDraftInput): boolean {
  if (input.platform === 'xiaohongshu') {
    const lines = content.split('\n').map((line) => line.trim()).filter(Boolean);
    const title = lines[0] ?? '';
    const hashtags = content.match(/#[^\s#]+/g) ?? [];
    const body = lines.slice(1).filter((line) => !line.startsWith('#')).join('');
    const chineseCharacters = body.match(/[\u4e00-\u9fff]/g)?.length ?? 0;
    return Array.from(title).length <= 30 && chineseCharacters >= xiaohongshuMinimumBodyLength(input) && chineseCharacters <= 360 && hashtags.length >= 2 && hashtags.length <= 8;
  }

  if (input.platform === 'google' || input.platform === 'yelp') {
    if (/#|[✨💆🤍]/u.test(content)) return false;
    const words = englishWordCount(content);
    return input.platform === 'google' ? words >= 60 && words <= 120 : words >= 80 && words <= 150;
  }

  const hashtags = content.match(/#[^\s#]+/g) ?? [];
  const body = content.replace(/#[^\s#]+/g, ' ');
  const words = englishWordCount(body);
  return words >= 50 && words <= 100 && hashtags.length >= 5 && hashtags.length <= 10;
}

function englishWordCount(content: string): number {
  return content.match(/[a-z0-9]+(?:['’-][a-z0-9]+)?/gi)?.length ?? 0;
}

export async function generateReviewDraft(input: ReviewDraftInput): Promise<GeneratedDraft> {
  const deepSeekKey = process.env.DEEPSEEK_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  const providers: Array<{ provider: CompatibleChatProvider; mode: Exclude<GeneratedDraft['mode'], 'local'> }> = [];

  if (deepSeekKey) {
    providers.push({ provider: deepSeekProvider(deepSeekKey), mode: 'deepseek' });
  }
  if (groqKey) {
    providers.push({ provider: groqProvider(groqKey), mode: 'groq' });
  }

  if (providers.length > 0) {
    try {
      // Providers race each other so one slow upstream does not make every
      // customer wait through a serial retry chain.
      const generated = await Promise.any(providers.map(async (candidate) => {
        const content = await generateWithRemoteProvider(input, candidate.provider);
        if (!content) throw new Error('Provider did not return a valid draft.');
        return { content, mode: candidate.mode, platform: input.platform } satisfies GeneratedDraft;
      }));
      return generated;
    } catch {
      // A validated, source-bound local result is used below when every
      // configured provider times out or misses the platform format.
    }
  }

  const content = input.platform === 'google'
    ? localGoogleDraft(input)
    : input.platform === 'yelp'
      ? localYelpDraft(input)
      : input.platform === 'instagram'
        ? localInstagramDraft(input)
        : localXiaohongshuDraft(input);
  return {
    content,
    mode: 'local',
    platform: input.platform,
    fallbackValidated: isGroundedRemoteDraft(content, input),
  };
}

export async function generateMerchantReply(input: {
  platform: ReviewPlatform;
  merchantName: string;
  reviewText: string;
  tone: string;
}): Promise<GeneratedDraft> {
  const fallback = localMerchantReply(input);
  // Chinese merchant replies have a much higher risk of a model adding
  // unprovided warmth, promises, or service claims. The source-bound local
  // variation is more useful than a fluent but unreliable reply draft.
  if (isChinesePlatform(input.platform)) {
    return { content: fallback, mode: 'local', platform: input.platform };
  }
  const system = `Write a ${isChinesePlatform(input.platform) ? 'Chinese' : 'English'} merchant reply for ${input.merchantName}. Tone: ${input.tone}. Use exactly one or two concise sentences. Sound like a thoughtful person, not a corporate template. Mention the review by copying its wording, not by paraphrasing it; in Chinese, put that copied wording inside Chinese quotation marks. The only non-review content you may add is a brief thank-you. Do not introduce a new emotional word, policy, promise, future intent, invitation to return, staff claim, medical claim, discount, or any other detail. Never use generic phrases such as “we believe,” “every guest,” “always here,” “look forward to,” or “hope to see you.” Output only the reply.`;
  const providers: Array<{ provider: CompatibleChatProvider; mode: Exclude<GeneratedDraft['mode'], 'local'> }> = [];
  if (process.env.DEEPSEEK_API_KEY) {
    providers.push({ provider: deepSeekProvider(process.env.DEEPSEEK_API_KEY), mode: 'deepseek' });
  }
  if (process.env.GROQ_API_KEY) {
    providers.push({ provider: groqProvider(process.env.GROQ_API_KEY), mode: 'groq' });
  }

  for (const candidate of providers) {
    try {
      const content = await requestCompatibleChat(candidate.provider, system, input.reviewText, 0.2, 140);
      if (content && isGroundedMerchantReply(content, input)) {
        return { content, mode: candidate.mode, platform: input.platform };
      }
    } catch {
      // Continue to the next configured provider, then use the safe local reply.
    }
  }

  return { content: fallback, mode: 'local', platform: input.platform };
}

function localMerchantReply(input: Pick<Parameters<typeof generateMerchantReply>[0], 'platform' | 'reviewText' | 'tone'>): string {
  const firstNote = sentenceCase(input.reviewText)
    .split(/[.。！？!?]/)[0]
    .replace(/[“”"]/g, '')
    .trim()
    .slice(0, 220);

  if (isChinesePlatform(input.platform)) {
    if (!firstNote) return '谢谢你认真分享这次体验。';
    if (input.tone.toLowerCase().includes('concise')) return `谢谢你写下“${firstNote}”。`;
    if (input.tone.toLowerCase().includes('warm')) return `谢谢你把“${firstNote}”分享出来。`;
    return `看到你提到“${firstNote}”，谢谢你留下这条反馈。`;
  }
  if (!firstNote) return 'Thank you for taking the time to share your feedback.';
  if (input.tone.toLowerCase().includes('concise')) return `Thank you for sharing “${firstNote}.”`;
  if (input.tone.toLowerCase().includes('warm')) return `Thank you for putting this into words: “${firstNote}.”`;
  return `We appreciate you leaving this note: “${firstNote}.”`;
}

function isGroundedMerchantReply(
  content: string,
  input: Pick<Parameters<typeof generateMerchantReply>[0], 'platform' | 'reviewText'>,
): boolean {
  const generated = content.toLowerCase();
  const source = input.reviewText.toLowerCase();
  const disallowed = [
    'always', 'every guest', 'we believe', 'we will', 'we’re here', "we're here", 'look forward', 'hope to see',
    'discount', 'medical', 'guarantee', 'policy', 'promise', 'come back', 'next visit',
    '疗效', '折扣', '保证', '期待下次', '随时', '一定会', '承诺', '温暖', '体谅', '感动', '开心', '高兴', '荣幸',
    '安心', '放心', '满意', '支持', '陪伴', '努力', '改进',
  ];
  if (disallowed.some((phrase) => generated.includes(phrase) && !source.includes(phrase))) return false;

  if (isChinesePlatform(input.platform)) {
    const fragments = Array.from(source.matchAll(/[\u4e00-\u9fff]{2,}/g)).flatMap((match) => {
      const phrase = match[0];
      return Array.from({ length: Math.max(0, phrase.length - 1) }, (_, index) => phrase.slice(index, index + 2));
    });
    return fragments.some((fragment) => generated.includes(fragment));
  }

  const stopWords = new Set(['about', 'after', 'and', 'been', 'could', 'did', 'feel', 'from', 'have', 'into', 'that', 'the', 'this', 'they', 'was', 'were', 'with', 'would', 'your']);
  const details = Array.from(new Set((source.match(/[a-z]{4,}/g) ?? []).filter((word) => !stopWords.has(word))));
  const mentionsSourceDetail = details.filter((detail) => generated.includes(detail)).length >= Math.min(2, details.length);
  return mentionsSourceDetail && usesOnlyGroundedMerchantReplyVocabulary(content, input.reviewText);
}

function englishTokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[’]/g, "'")
    .match(/[a-z0-9]+(?:'[a-z0-9]+)?/g) ?? [];
}

/**
 * A merchant reply may add a short thank-you shell, but otherwise it has to
 * quote or reuse the review's words. This closes the gap left by checking a
 * handful of known risky phrases alone: an unlisted promise or sentiment is
 * still rejected and the safe local reply is used instead.
 */
function usesOnlyGroundedMerchantReplyVocabulary(content: string, reviewText: string): boolean {
  const sourceTokens = new Set(englishTokens(reviewText));
  const thankYouShell = new Set([
    'a', 'an', 'and', 'appreciate', 'appreciated', 'for', 'leaving', 'note',
    'share', 'sharing', 'thank', 'thanks', 'that', 'the', 'this', 'time', 'to',
    'we', 'you', 'your',
  ]);
  return englishTokens(content).every((token) => sourceTokens.has(token) || thankYouShell.has(token));
}
