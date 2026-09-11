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
  const service = formatList(input.serviceNames, 'and');
  const experience = sentenceCase(input.experience) || input.tags.join(', ');
  const seed = input.seed ?? Date.now();
  return pick([
    `I went to ${input.merchantName} in ${input.location} for ${service}. ${experience}. The visit gave me room to pay attention to how I actually felt instead of rushing on to the next thing. What stayed with me afterward was the simple sense that the time had been well spent. It was an easy experience to describe because those details were the parts that genuinely stood out to me.`,
    `${input.merchantName} was where I booked ${service} during my visit to ${input.location}. ${experience}. I noticed those things without having to think too hard about them, which made the appointment feel straightforward and comfortable. By the time I left, that was still the clearest impression I had. It felt worth taking a moment to write down while the visit was still fresh.`,
    `I booked ${service} at ${input.merchantName} in ${input.location}. ${experience}. That combination is what I remember most clearly from the appointment. The experience felt easy to settle into, and I appreciated being able to take the visit at face value. When I thought about it later, the same details came back first, so they are the most honest way for me to describe it.`,
  ], seed);
}

function localYelpDraft(input: ReviewDraftInput): string {
  const service = formatList(input.serviceNames, 'and');
  const experience = sentenceCase(input.experience) || input.tags.join(', ');
  const seed = (input.seed ?? Date.now()) + 11;
  return pick([
    `I visited ${input.merchantName} in ${input.location} for ${service}. ${experience}. I had enough time during the appointment to notice what felt different instead of moving through it on autopilot. The details that stayed with me were small but clear, and they shaped the whole visit for me. Looking back, the experience felt consistent with what I had hoped for when I booked the service, and I left with a calm, straightforward impression of the appointment.`,
    `For this visit to ${input.merchantName}, I booked ${service}. ${experience}. Those parts of the appointment stood out naturally and did not need much embellishment. I found myself thinking about them again later because they made the visit feel easy to remember. The experience in ${input.location} was simple in a good way: I knew what I had come in for, had the time to take it in, and left with a clear sense of the visit.`,
    `${input.merchantName} in ${input.location} was where I tried ${service}. ${experience}. What I liked most was being able to notice those details as the visit unfolded rather than only thinking about them afterward. They made the appointment feel settled and gave me a clear takeaway from the time I spent there. It was the kind of experience that was easy to remember later for a few specific, personal reasons.`,
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

  return pick([
    `${input.merchantName}${mention} ✨\n\nI stopped in for ${service}, and this is what stayed with me afterward: ${note}. It was nice to give the visit its own space instead of rushing through the moment. A simple pause in ${input.location}, and one I was glad I made time for. 🤍\n\n${hashtags}`,
    `A little time at ${input.merchantName}${mention} 💆\n\nI booked ${service}. ${note}. Those were the details I noticed most, and they made the visit easy to remember later. Sometimes a straightforward appointment is exactly enough. This one in ${input.location} left a clear impression without needing a big story around it. ✨\n\n${hashtags}`,
    `${service} at ${input.merchantName}${mention} 🤍\n\n${note}. That was the part of the visit that stayed in my mind afterward. I liked being able to slow the moment down and simply notice how it felt. A small piece of my day in ${input.location}, but one that was worth remembering. ✨\n\n${hashtags}`,
    `After work at ${input.merchantName}${mention} ✨\n\nI made time for ${service}. ${note}. The calm pace was what I noticed most, and it stayed with me after I headed home. Nothing dramatic, just a visit that gave the day a quieter ending and felt easy to remember later. 🤍\n\n${hashtags}`,
    `${input.merchantName}${mention}, one small pause in the day 💆\n\nI came in for ${service}. ${note}. Once I had time to settle, the rest of the day felt less hurried. That simple change in pace is what I remember from the visit in ${input.location}. ✨\n\n${hashtags}`,
  ], seed);
}

function localXiaohongshuDraft(input: ReviewDraftInput): string {
  const service = formatList(input.serviceNames, '和');
  const experience = sentenceCase(input.experience);
  const seed = input.seed ?? Date.now();

  const title = Array.from(pick([
    `在${input.merchantName}放松一下`,
    `${service}体验随记`,
    `给自己慢下来的时间`,
    `巴尔的摩护理随记`,
    `今天的放松安排`,
  ], seed)).slice(0, 20).join('');
  const location = input.location.replace(/Baltimore(?:,\s*MD)?/i, '巴尔的摩');
  const tagSentences = input.tags.map(xiaohongshuFeelingSentence).filter(Boolean).join('');
  const ownWords = experience && /[\u4e00-\u9fff]/.test(experience) ? `${experience.replace(/[。！？!?]+$/, '')}。` : '';
  const opening = ownWords
    ? `这次去的是${location}的 ${input.merchantName}。${ownWords}`
    : `在${location}的 ${input.merchantName} 做了${service}。`;
  const body = extendShortXiaohongshuBody(
    `${opening}${tagSentences}`,
    input,
    180,
  );
  const tagList = [
    hashtag(input.merchantName),
    hashtag(input.location),
    hashtag(service),
    ...input.tags.map(hashtag),
  ].filter(Boolean).slice(0, 8).join(' ');

  return `${title}\n\n${body}\n\n${tagList}`;
}

function xiaohongshuFeelingSentence(tag: string): string {
  const copy: Record<string, string> = {
    '肩颈松了': '做完后最明显的是肩颈没那么紧了，身体跟着轻松了一些。',
    '终于慢下来': '难得把节奏放慢一点，整个人也慢慢松了下来。',
    '没有推销': '过程中没有推销，待着会更自在，不用分心应付别的事情。',
    '值得再来': '这次留下的感受不错，以后有需要时我还会再考虑。',
    '放松舒服': '整个感受比较放松，身体和心情都没有那么绷着。',
    '细心专业': '让我印象比较深的是细致和专业，体验起来很踏实。',
    '环境整洁': '环境收拾得很整洁，看着清爽，待着也舒服。',
    '节奏不赶': '节奏安排得不赶，可以按自己的状态慢慢来。',
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

  // Xiaohongshu
  return `你是一位中文母语顾客，为【${input.merchantName}】写一篇自然、克制、有生活气息的小红书体验笔记。
严格格式与合规要求：
编辑原则：
${editorialPrinciples}
1. 语言：中文。
2. 标题：第1行必须是简短、自然的标题，长度严格控制在 20 字以内（可带合适 Emoji）。
3. 正文：严格 120–160 个中文字符，写 6–8 句，分 2–3 个短段落，空行隔开。使用中国人日常分享会说的短句和自然语序，不写说明文，不写翻译腔，不重复同一个感受。英文顾客原话只提炼事实和感受后自然转述，绝不逐句翻译。地点如需出现，把 “Baltimore, MD” 写成“巴尔的摩”，禁止出现“这次在Baltimore, MD的MS BEAUTY”一类中英夹杂句式。字数不足时，只能围绕已提供的感受自然展开，绝不能补充新的事件或细节。
4. 账号提及：${xhsAccountRule}
5. 门店名：正文必须原样出现“${input.merchantName}”，不得翻译、省略或只写“这家店”。
6. 话题标签：文末附带 3–8 个话题标签；标签只能使用门店名、地点、已选项目和已选感受。
7. 内容边界：只可使用输入中明确提供的项目、标签与顾客原话；不可补充环境、员工、流程、效果或任何未提供细节。尤其不得自行写“躺下/椅子/睡着/手法/一小时/赶时间/看手机”等场景；这些词除非顾客原话中出现，否则一律不用。
8. 合规红线：严禁极限词（如“最好”、“第一”），严禁提及“好评返现/送折扣”等违规诱导。不要写“我不想把它写成推荐”“我勾选的是”“发布前再核对”“按真实体验修改”“这条笔记记录的是”等模型说明或创作过程。
9. 本次写作角度：${variationDirection}
10. 不得使用“宝藏店”“体验感拉满”“闭眼冲”“姐妹们冲”“种草”“治愈”“绝绝子”等模板化表达。
11. 只输出纯文本笔记。`;
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
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

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
    ? `门店：${input.merchantName} (${input.location})\n已选项目：${services}\n已选感受：${tags}${input.experience ? `\n顾客原话：${input.experience}` : ''}\n\n只可使用以上事实。未选项目、未填写感受或未出现的细节必须完全不提。请写文案：`
    : `Store: ${input.merchantName} in ${input.location}\nSelected services: ${services}\nSelected feelings: ${tags}${input.experience ? `\nCustomer note: ${input.experience}` : ''}\n\nUse only the facts above. Do not mention any service, staff, cleanliness, timing, ambiance, outcome, or detail that does not literally appear above. Please write the review:`;

  const temperature = input.voice === 'concise' ? 0.8 : 0.95;

  const attempts = input.platform === 'xiaohongshu' ? 10 : input.platform === 'instagram' ? 8 : 5;
  let formatFeedback = '';
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const retryRequirement = input.platform === 'instagram'
      ? 'The last caption was invalid. Return 60–85 English non-hashtag words followed by exactly 5–10 end hashtags. Include the exact supplied Instagram handle and no other @ handle. Use only supplied facts; no explanation.'
      : input.platform === 'xiaohongshu'
        ? formatFeedback || '上一次格式不合格。请这次只输出符合全部长度、标题和标签要求的成稿，不要解释。'
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
    if (input.platform === 'xiaohongshu') formatFeedback = getXiaohongshuFormatFeedback(content);
  }

  return null;
}

function getXiaohongshuFormatFeedback(content: string): string {
  const lines = content.split('\n').map((line) => line.trim()).filter(Boolean);
  const title = lines[0] ?? '';
  const body = lines.slice(1).filter((line) => !line.startsWith('#')).join('');
  const chineseCharacters = body.match(/[\u4e00-\u9fff]/g)?.length ?? 0;
  const hashtags = content.match(/#[^\s#]+/g)?.length ?? 0;
  const issues: string[] = [];
  if (Array.from(title).length > 20) issues.push('标题超过 20 字');
  if (chineseCharacters < 100) issues.push(`正文只有 ${chineseCharacters} 个中文字符，必须扩写到 100–180 个`);
  if (chineseCharacters > 200) issues.push(`正文有 ${chineseCharacters} 个中文字符，必须缩到 100–180 个`);
  if (hashtags < 3 || hashtags > 8) issues.push(`标签数量为 ${hashtags}，必须是 3–8 个`);
  return `刚才的成稿未通过检查：${issues.join('；') || '格式或内容不合格'}。请重写一篇合格成稿。只能围绕已选项目和感受，把这些已选感受写得更完整；不得补充门店环境、员工、流程、时间、价格或其他未提供事实。只输出成稿，不要解释。`;
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

  const temporalLead = /今天|昨天|前几天|上周|周末/;
  if (!temporalLead.test(input.experience)) {
    normalized = normalized.replace(
      /(^|\n)\s*(?:今天|昨天|前几天|上周|周末)(?:我)?(?:去|来|做|体验)[^，。！？\n]*[，,]?/g,
      '$1',
    ).trim();
  }

  const lines = normalized.split('\n').map((line) => line.trim()).filter(Boolean);
  const firstLine = lines[0] ?? '';
  // Models occasionally omit a standalone title and start directly with the
  // body. Do not silently discard that first paragraph by treating it as a
  // title; provide a neutral title and preserve the customer's wording.
  const hasStandaloneTitle = Array.from(firstLine).length <= 20 && !/[。！？]/.test(firstLine);
  const rawTitle = hasStandaloneTitle ? (lines.shift() ?? '') : `${input.merchantName}体验记录`;
  const title = Array.from(rawTitle).slice(0, 20).join('');
  const rawBody = lines
    .filter((line) => !line.startsWith('#'))
    .join('\n')
    .replace(/@MS\s*BEAUTY(?:（[^）]+）)?/gi, input.merchantName)
    .replace(/(?:^|\s)@[\w.-]+的?/gu, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  // Only shorten an overlong model response; never pad or add fictional
  // customer details merely to meet a target length.
  const bodyLimit = 180;
  const bodyBase = Array.from(rawBody).slice(0, bodyLimit).join('').trim();
  const body = extendShortXiaohongshuBody(bodyBase, input, bodyLimit);
  const safeTags = Array.from(new Set([
    hashtag(input.merchantName),
    hashtag(input.location),
    ...input.serviceNames.map(hashtag),
    ...input.tags.map(hashtag),
  ].filter(Boolean))).slice(0, 8);

  if (title && body && safeTags.length >= 3) {
    normalized = `${title}\n\n${body}\n\n${safeTags.join(' ')}`;
  }
  return normalized;
}

function extendShortXiaohongshuBody(body: string, input: ReviewDraftInput, limit: number): string {
  let extended = body;
  const additions = input.tags
    .map((tag) => ({ tag, text: xiaohongshuFeelingSentence(tag) }))
    .filter((item) => Boolean(item.text));

  for (const { tag, text } of additions) {
    const chineseCharacters = extended.match(/[\u4e00-\u9fff]/g)?.length ?? 0;
    if (chineseCharacters >= 100) break;
    if (isXiaohongshuFeelingCovered(extended, tag)) continue;
    if (!extended.includes(text)) extended = `${extended}${text}`;
  }
  return Array.from(extended).slice(0, limit).join('').trim();
}

function isXiaohongshuFeelingCovered(body: string, tag: string): boolean {
  if (tag === '肩颈松了') return /肩颈[^。！？]{0,12}(?:松|轻)/.test(body);
  if (tag === '终于慢下来') return /慢下来|节奏[^。！？]{0,10}(?:慢|不赶)/.test(body);
  if (tag === '没有推销') return /没有推销|不推销/.test(body);
  if (tag === '值得再来') return /值得再来|还会再来|愿意再来/.test(body);
  if (tag === '放松舒服') return /放松|舒服/.test(body);
  if (tag === '细心专业') return /细心|细致|专业/.test(body);
  if (tag === '环境整洁') return /环境[^。！？]{0,10}(?:整洁|干净|清爽)/.test(body);
  if (tag === '节奏不赶') return /不赶|节奏[^。！？]{0,10}(?:慢|松)/.test(body);
  return false;
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
    /最好|第一|顶级|完美|拉满|彻底|宝藏店|闭眼冲|姐妹们冲|种草|治愈|绝绝子/,
    /包治/, /彻底根除/, /神医/, /百病/, /保修/, /好评返现|好评.*折扣/,
    /I am keeping|this review is based on|selected (?:service|details)|basis for (?:this|my) review|personal perspective/i,
    /我不想把.*写成|只想把.*记下来|我勾选的是|发布前.*核对|按.*真实.*修改|这条笔记记录的是|没有打算延伸成/,
  ];
  if (alwaysBlocked.some((pattern) => pattern.test(content))) return false;
  if (input.platform === 'xiaohongshu' && hasUnprovidedXiaohongshuScene(content, input)) return false;
  if (input.platform === 'xiaohongshu' && /@|MSBEAUTY_BALTIMORE/i.test(content)) return false;
  if (input.platform === 'instagram') {
    const expectedMention = input.socialHandles?.instagram
      ? `@${input.socialHandles.instagram.replace(/^@/, '')}`.toLowerCase()
      : '';
    const mentions = content.match(/@[\w.-]+/g)?.map((mention) => mention.toLowerCase()) ?? [];
    if (expectedMention && !mentions.includes(expectedMention)) return false;
    if (mentions.some((mention) => mention !== expectedMention)) return false;
  }
  if (!content.toLowerCase().includes(input.merchantName.toLowerCase())) return false;

  return hasPlatformAppropriateLength(content, input.platform);
}

function hasUnprovidedXiaohongshuScene(content: string, input: ReviewDraftInput): boolean {
  const suppliedFacts = [input.experience, ...input.serviceNames, ...input.tags].join('');
  const sceneTerms = [
    '躺', '椅子', '睡', '手法', '流程', '环境', '房间', '一小时', '上班', '赶时间', '看手机',
    '傍晚', '天黑', '天已经暗', '天气', '有点凉', '下雨', '进门', '出门', '出来', '预约', '等待',
  ];
  return sceneTerms.some((term) => content.includes(term) && !suppliedFacts.includes(term));
}

function hasPlatformAppropriateLength(content: string, platform: ReviewPlatform): boolean {
  if (platform === 'xiaohongshu') {
    const lines = content.split('\n').map((line) => line.trim()).filter(Boolean);
    const title = lines[0] ?? '';
    const hashtags = content.match(/#[^\s#]+/g) ?? [];
    const body = lines.slice(1).filter((line) => !line.startsWith('#')).join('');
    const chineseCharacters = body.match(/[\u4e00-\u9fff]/g)?.length ?? 0;
    return Array.from(title).length <= 20 && chineseCharacters >= 100 && chineseCharacters <= 200 && hashtags.length >= 3 && hashtags.length <= 8;
  }

  if (platform === 'google' || platform === 'yelp') {
    if (/#|[✨💆🤍]/u.test(content)) return false;
    const words = englishWordCount(content);
    return platform === 'google' ? words >= 60 && words <= 120 : words >= 80 && words <= 150;
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

  for (const candidate of providers) {
    try {
      const content = await generateWithRemoteProvider(input, candidate.provider);
      if (content) return { content, mode: candidate.mode, platform: input.platform };
    } catch {
      // Continue to next provider
    }
  }

  const content = input.platform === 'google'
    ? localGoogleDraft(input)
    : input.platform === 'yelp'
      ? localYelpDraft(input)
      : input.platform === 'instagram'
        ? localInstagramDraft(input)
        : localXiaohongshuDraft(input);
  return { content, mode: 'local', platform: input.platform };
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
