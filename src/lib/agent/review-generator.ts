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
    `My visit to ${input.merchantName} in ${input.location} was for ${service}. The part I want to share is this: ${experience}. That is the detail I noticed during this visit, and it is why I wanted to leave a note. I am keeping this review focused on my own selected service and experience. For anyone considering ${input.merchantName}, this is simply my personal perspective from that appointment.`,
    `At ${input.merchantName} in ${input.location}, I chose ${service}. ${experience}. I wanted my review to stay specific to what I selected and experienced, rather than add general claims. These points describe my visit in the clearest way I can: the service I chose and the feeling I took away from it. This is my own review of that visit to ${input.merchantName}.`,
    `I visited ${input.merchantName} in ${input.location} for ${service}. My note from the visit is: ${experience}. I am sharing that exact part because it stood out to me personally. Nothing else needs to be added to make the point—the selected service and this experience are the full basis for my review. That was my experience with ${input.merchantName}.`,
  ], seed);
}

function localYelpDraft(input: ReviewDraftInput): string {
  const service = formatList(input.serviceNames, 'and');
  const experience = sentenceCase(input.experience) || input.tags.join(', ');
  const seed = (input.seed ?? Date.now()) + 11;
  return pick([
    `I went to ${input.merchantName} in ${input.location} for ${service}. The specific things I selected to describe the visit are: ${experience}. I am writing this review around those points because they are the parts I actually experienced. I do not want to turn a personal note into a generic description of the business. If those details are useful to another visitor, that is the most accurate way I can share my visit to ${input.merchantName}.`,
    `For my visit to ${input.merchantName}, I chose ${service}. ${experience}. This is the part of the appointment I wanted to document, and it is the basis for this review. I prefer to keep the description tied to the service and the details I selected, without filling it with assumptions. That makes this a straightforward account of my experience at ${input.merchantName} in ${input.location}.`,
    `${input.merchantName} in ${input.location} was where I had ${service}. My own note is: ${experience}. That is what I would highlight from the visit. I am deliberately keeping this review close to the facts I selected, so it reads as a real customer note rather than a broad promotional statement. This is my perspective on the service I chose at ${input.merchantName}.`,
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
  const note = typedExperience || tagList;
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
    `A note from ${input.merchantName}${mention} ✨\n\nI chose ${service}. My own words from the visit: ${note}\n\nI am keeping this post close to the selected service and details, without adding a broader description. This is my personal note from ${input.merchantName} in ${input.location}. 🤍\n\n${hashtags}`,
    `${input.merchantName}${mention} — a short visit note ✨\n\nSelected service: ${service}. What I wrote down was: ${note}\n\nPosting the details that mattered to me from this visit, and leaving out anything I did not experience or choose. That is my own record from ${input.merchantName}. 🤍\n\n${hashtags}`,
    `Sharing one specific note from ${input.merchantName}${mention} ✨\n\nFor ${service}, the part I wanted to remember was: ${note}\n\nThis caption stays with those selected details only. It is a small personal record from my visit in ${input.location}, written in my own words. 🤍\n\n${hashtags}`,
  ], seed);
}

function localXiaohongshuDraft(input: ReviewDraftInput): string {
  const service = formatList(input.serviceNames, '和');
  const tagsStr = input.tags.join('、');
  const experience = sentenceCase(input.experience);
  const seed = input.seed ?? Date.now();

  const mention = input.socialHandles?.xiaohongshu
    ? ` @${input.socialHandles.xiaohongshu.replace(/^@/, '')}`
    : '';

  const title = pick([
    `${input.merchantName}体验记录`,
    `${service}的一次记录`,
    `今天只记这次${service}`,
  ], seed);
  const ownWords = experience ? `我自己补充的一句是：“${experience}”。` : '';
  const body = pick([
    `这次在${input.location}的${input.merchantName}${mention}选了${service}。我不想把它写成一段夸张的推荐，只想把自己确认过的项目和感受认真记下来。\n\n我勾选的是${tagsStr}。这几个词听起来很简单，却是我这次最想留下的部分。${ownWords}发布前我也会按当天的真实体验再核对一遍。`,
    `这条笔记记录的是${input.merchantName}${mention}的一次${service}，地点在${input.location}。没有打算延伸成别的故事，重点就放在我实际选择的项目和感受上。\n\n这次我选了${tagsStr}。对我来说，这些感受已经足够具体；${ownWords}剩下的内容，发布前会再按自己的真实情况修改。`,
    `在${input.location}的${input.merchantName}${mention}，这次我选择了${service}。写下来时，我更想保留那些确实属于这次体验的感受，而不是补进没有发生过的细节。\n\n我勾选的是${tagsStr}。这就是我现在最直接的记录。${ownWords}等准备发布时，我会再把文字改得更贴近当天的真实感受。`,
  ], seed);
  const tagList = [
    hashtag(input.merchantName),
    hashtag(input.location),
    hashtag(service),
    ...input.tags.map(hashtag),
  ].filter(Boolean).slice(0, 8).join(' ');

  return `${title}\n\n${body}\n\n${tagList}`;
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
- Do not use ratings language, sales language, calls to action, recommendations, or a business-owner voice.
- Avoid filler, symmetry, and list-like wording. Use varied sentence length and a specific first-person rhythm that sounds like one person wrote it after one visit.
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

  const xhsMentionRule = input.socialHandles?.xiaohongshu
    ? `在正文中自然提及 @${input.socialHandles.xiaohongshu.replace(/^@/, '')}。`
    : '不要虚构账号。';

  if (input.platform === 'google') {
    return `You are a genuine customer writing a 5-star Google review for "${input.merchantName}" in ${input.location}.
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
    return `You are a genuine customer writing a detailed 5-star Yelp review for "${input.merchantName}" in ${input.location}.
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
  return `你是一位在美华人顾客，刚在 ${input.location} 的【${input.merchantName}】体验完项目，写一篇真实、有生活气息的小红书打卡笔记。
严格格式与合规要求：
编辑原则：
${editorialPrinciples}
1. 语言：中文。
2. 标题：第1行必须是简短、自然的标题，长度严格控制在 20 字以内（可带合适 Emoji）。
3. 正文：严格 100–180 个中文字符，分 2–3 个短段落，空行隔开，语气自然舒服，适量 Emoji。把英文顾客原话自然翻成中文，不要逐句引用英文。
4. 账号提及：${xhsMentionRule}
5. 门店名：正文必须原样出现“${input.merchantName}”，不得翻译、省略或只写“这家店”。
6. 话题标签：文末附带 3–8 个话题标签；标签只能使用门店名、地点、已选项目和已选感受。
7. 内容边界：只可使用输入中明确提供的项目、标签与顾客原话；不可补充环境、员工、流程、效果或任何未提供细节。
8. 合规红线：严禁极限词（如“最好”、“第一”），严禁提及“好评返现/送折扣”等违规诱导。无生硬套话与AI感。
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

  const temperature = input.voice === 'concise' ? 0.7 : 0.8;

  const attempts = input.platform === 'xiaohongshu' ? 8 : input.platform === 'instagram' ? 4 : 3;
  let formatFeedback = '';
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const retryRequirement = input.platform === 'instagram'
      ? 'The last caption was invalid. Return only 50–100 English non-hashtag words followed by exactly 5–10 end hashtags; no explanation.'
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
      800,
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
  const rawTitle = lines.shift() ?? '';
  const title = Array.from(rawTitle).slice(0, 20).join('');
  const rawBody = lines
    .filter((line) => !line.startsWith('#'))
    .join('\n')
    .replace(/(?:^|\s)@[\w.-]+/gu, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  const configuredMention = input.socialHandles?.xiaohongshu
    ? `@${input.socialHandles.xiaohongshu.replace(/^@/, '')}`
    : '';
  // Only shorten an overlong model response; never pad or add fictional
  // customer details merely to meet a target length.
  const bodyLimit = configuredMention ? 180 - Array.from(configuredMention).length - 1 : 180;
  const bodyBase = Array.from(rawBody).slice(0, bodyLimit).join('').trim();
  const body = configuredMention && bodyBase ? `${bodyBase} ${configuredMention}` : bodyBase;
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
  ];
  if (alwaysBlocked.some((pattern) => pattern.test(content))) return false;
  if (!content.toLowerCase().includes(input.merchantName.toLowerCase())) return false;

  return hasPlatformAppropriateLength(content, input.platform);
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
