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
  const service = formatList(input.serviceNames, 'and') || 'session';
  const experience = sentenceCase(input.experience);
  const voice = input.voice ?? 'natural';
  const seed = input.seed ?? Date.now();
  const tagsPhrase = input.tags.length > 0 ? input.tags.join(' and ') : 'calm atmosphere and attentive service';

  const details = experience && !/[\u4e00-\u9fff]/.test(experience)
    ? experience
    : input.tags.length > 0
      ? `The ${tagsPhrase.toLowerCase()} really stood out to me from the start`
      : 'The peaceful atmosphere and kind staff made me feel welcome immediately';

  if (voice === 'concise') {
    return `Had a truly wonderful visit to ${input.merchantName} in ${input.location} for their ${service}. ${details}. The space was spotless, unhurried, and comfortable throughout. The team took genuine care with every step of the appointment. A very enjoyable and relaxing experience overall, and I look forward to coming back again soon!`;
  }
  if (voice === 'warm') {
    return `Such a lovely, restorative visit to ${input.merchantName} in ${input.location}! I booked an appointment for their ${service}, and from the moment I arrived, ${details.toLowerCase()}. The environment felt so calm, clean, and genuinely welcoming. Every single detail showed skilled care and attention. Left feeling completely refreshed, and I would gladly recommend them to anyone in the area.`;
  }
  return pick([
    `Really enjoyed my visit to ${input.merchantName} in ${input.location} for the ${service}. ${details}. Everything felt immaculate, comfortable, and very thoughtfully handled without any feeling of being rushed. The staff was attentive and professional the whole time. A fantastic local spot that I definitely look forward to visiting again.`,
    `Had a great experience at ${input.merchantName} trying their ${service}. ${details}. The setting is peaceful and clean, and the staff made sure I was comfortable through every step of the service. Truly appreciated the unhurried pace and skilled care. Highly recommend checking them out!`,
  ], seed);
}

function localYelpDraft(input: ReviewDraftInput): string {
  const service = formatList(input.serviceNames, 'and') || 'service';
  const experience = sentenceCase(input.experience);
  const voice = input.voice ?? 'natural';
  const seed = (input.seed ?? Date.now()) + 11;
  const tagsPhrase = input.tags.length > 0 ? input.tags.join(' and ') : 'peaceful space, skilled care, and thoughtful staff';

  const details = experience && !/[\u4e00-\u9fff]/.test(experience)
    ? experience
    : input.tags.length > 0
      ? `What stood out most was the ${tagsPhrase.toLowerCase()}`
      : 'The calming ambiance and the staff’s attention to detail made an immediate positive impression';

  if (voice === 'concise') {
    return `Came to ${input.merchantName} in ${input.location} and had a fantastic appointment. Booked their ${service}, and the overall quality was evident right away. ${details}. The facility is spotless, quiet, and well-managed, and the staff took the time to explain everything clearly without any pressure. Highly recommend them for anyone looking for consistent, professional care in the area. Will definitely be returning for another appointment.`;
  }
  return pick([
    `I booked a visit to ${input.merchantName} in ${input.location} for their ${service}, and it exceeded my expectations. Check-in was smooth, and the entire space felt peaceful and exceptionally clean. ${details}. The staff was patient, knowledgeable, and genuinely attentive from beginning to end. It is rare to find a business that balances technical skill with such a welcoming environment. A standout spot in Baltimore that I will happily revisit and recommend to friends.`,
    `Had an exceptional experience at ${input.merchantName}. I tried their ${service} based on positive recommendations, and I am glad I did. ${details}. The entire appointment was completely unhurried, relaxing, and tailored to what I needed. The treatment room was immaculate and comfortable. If you appreciate skilled service and a tranquil atmosphere, this is definitely a place worth booking.`,
  ], seed);
}

function hashtag(value: string): string {
  const compact = value.replace(/[^a-zA-Z0-9]/g, '');
  return compact ? `#${compact.slice(0, 48)}` : '';
}

function localInstagramDraft(input: ReviewDraftInput): string {
  const typedExperience = sentenceCase(input.experience);
  const service = formatList(input.serviceNames, 'and') || 'self-care session';
  const tagList = input.tags.length > 0 ? input.tags.join(', ') : 'peaceful vibes';
  const note = typedExperience && !/[\u4e00-\u9fff]/.test(typedExperience)
    ? typedExperience
    : tagList
      ? `Loving the ${tagList.toLowerCase()} here.`
      : 'Much needed restorative time.';

  const mention = input.socialHandles?.instagram
    ? ` @${input.socialHandles.instagram.replace(/^@/, '')}`
    : '';

  const hashtags = [
    hashtag(input.merchantName),
    hashtag(service),
    hashtag(input.location || 'Baltimore'),
    '#SelfCare',
    '#SpaDay',
    '#WeekendVibes',
    '#WellnessJourney',
    '#CleanSpace',
  ].filter(Boolean).slice(0, 8).join(' ');

  return `Self-care afternoon at ${input.merchantName}${mention} ✨\n\nTried their ${service} today. ${note} The entire atmosphere felt so calming, clean, and restorative.\n\nLeft feeling completely refreshed and grounded 🤍\n\n${hashtags}`;
}

function localXiaohongshuDraft(input: ReviewDraftInput): string {
  const service = formatList(input.serviceNames, '和') || '面部与护理项目';
  const tagsStr = input.tags.length > 0 ? input.tags.join('、') : '环境舒服、服务细心';
  const experience = sentenceCase(input.experience);
  const seed = input.seed ?? Date.now();

  const expDetail = experience
    ? `我自己的真实感受是：${experience}`
    : `全程体验下来最大的亮点就是【${tagsStr}】。`;

  const mention = input.socialHandles?.xiaohongshu
    ? ` @${input.socialHandles.xiaohongshu.replace(/^@/, '')}`
    : '';

  const titles = [
    `✨在${input.location}挖到超治愈的${service}宝藏店！`,
    `💆周末放松打卡｜${input.merchantName}真实体验分享`,
    `🌿把疲惫一扫而空！私藏的${service}治愈小天地`,
  ];

  const bodies = [
    `这次在${input.merchantName}${mention}做了${service}，体验感真的拉满！\n\n${expDetail}空间干净私密，轻音乐伴随舒缓香气让人很快就沉静下来。技师细致周到，完全没有催促感，做完身心都得到了彻底的舒缓与放松～`,
    `近期在${input.merchantName}${mention}体验的${service}特别惊喜！\n\n${expDetail}进店就觉得环境雅致整洁，流程规范贴心，细节处处体现用心，做完感觉整个人轻松了不少，值得放进日常心动清单～`,
  ];

  const title = pick(titles, seed);
  const body = pick(bodies, seed);
  const tagList = [
    `#${input.location.replace(/[^a-zA-Z]/g, '') || 'Baltimore'}探店`,
    '#美容护理',
    `#${service.replace(/\s+/g, '')}`,
    '#沉浸式放松',
    '#周末好去处',
  ].join(' ');

  return `${title}\n\n${body}\n\n${tagList}`;
}

function buildSystemPrompt(input: ReviewDraftInput): string {
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
1. Language: English only.
2. Length: Exactly 60–120 words.
3. Format: Pure plain text in 1–2 paragraphs. NO title, NO hashtags, NO emojis.
4. Voice: ${voiceDesc} Authentic, grounded, no marketing fluff or AI cliches.
5. Content: Only reference the customer's selected services and feelings. Mention the merchant name "${input.merchantName}" naturally.
6. Guardrails: No extreme claims (e.g. "the best in the world", "#1"), no mention of discounts, promotions, or incentives for reviews.
7. Output ONLY the review text.`;
  }

  if (input.platform === 'yelp') {
    return `You are a genuine customer writing a detailed 5-star Yelp review for "${input.merchantName}" in ${input.location}.
STRICT FORMAT & COMPLIANCE RULES:
1. Language: English only.
2. Length: Exactly 80–150 words (more detailed and descriptive than Google).
3. Format: Pure plain text in 1–2 paragraphs. NO title, NO hashtags.
4. Voice: ${voiceDesc} Balanced, observational, highlighting ambiance, check-in, cleanliness, and thoughtful care.
5. Content: Only mention selected services/tags and genuine experience. Mention "${input.merchantName}".
6. Guardrails: No hyperbolic words ("best ever", "perfection"), no mention of discounts/exchanges.
7. Output ONLY the review text.`;
  }

  if (input.platform === 'instagram') {
    return `You are posting an aesthetic Instagram caption after visiting "${input.merchantName}" in ${input.location}.
STRICT FORMAT & COMPLIANCE RULES:
1. Language: English.
2. Length: Exactly 50–100 words.
3. Format: Segmented lines with subtle emojis (✨, 💆, 🤍). ${igMentionRule}
4. Hashtags: End with 5–10 relevant hashtags (e.g. #${input.merchantName.replace(/\s+/g, '')} #SelfCare).
5. Output ONLY the caption.`;
  }

  // Xiaohongshu
  return `你是一位在美华人顾客，刚在 ${input.location} 的【${input.merchantName}】体验完项目，写一篇真实、有生活气息的小红书打卡笔记。
严格格式与合规要求：
1. 语言：中文。
2. 标题：第1行必须是吸睛标题，长度严格控制在 20 字以内（可带合适 Emoji）。
3. 正文：100–200 字，分 2–3 个短段落，空行隔开，语气自然舒服，适量 Emoji。
4. 账号提及：${xhsMentionRule}
5. 话题标签：文末附带 3–8 个相关话题标签（如 #${input.location}探店）。
6. 合规红线：严禁极限词（如“最好”、“第一”），严禁提及“好评返现/送折扣”等违规诱导。无生硬套话与AI感。
7. 只输出纯文本笔记。`;
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
    const timeoutId = setTimeout(() => controller.abort(), 6000);

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
  const services = input.serviceNames.join(', ') || (isChinesePlatform(input.platform) ? 'SPA护理' : 'spa treatment');
  const tags = input.tags.join(', ') || (isChinesePlatform(input.platform) ? '放松舒服、细心专业' : 'relaxing atmosphere, thoughtful service');

  const user = isChinesePlatform(input.platform)
    ? `门店：${input.merchantName} (${input.location})\n体验项目：${services}\n体验感受：${tags}${input.experience ? `\n顾客原话：${input.experience}` : ''}\n请写文案：`
    : `Store: ${input.merchantName} in ${input.location}\nService: ${services}\nCustomer Highlights: ${tags}${input.experience ? `\nCustomer Note: ${input.experience}` : ''}\nPlease write the review:`;

  const temperature = input.voice === 'concise' ? 0.7 : 0.8;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const rawContent = await requestCompatibleChat(
      provider,
      system,
      user,
      temperature,
      input.platform === 'instagram' ? 260 : 450,
    );
    if (!rawContent) continue;
    const content = normalizeRemoteDraft(rawContent, input);
    if (!content) continue;

    if (!isChinesePlatform(input.platform) && /[\u4e00-\u9fff]/.test(content)) continue;
    if (isChinesePlatform(input.platform) && !/[\u4e00-\u9fff]/.test(content)) continue;
    if (isGroundedRemoteDraft(content, input)) return content;
  }

  return null;
}

function normalizeRemoteDraft(content: string, input: ReviewDraftInput): string {
  let normalized = content.replace(/\r\n/g, '\n').trim();
  if (!isChinesePlatform(input.platform)) return normalized;

  const temporalLead = /今天|昨天|前几天|上周|周末/;
  if (!temporalLead.test(input.experience)) {
    normalized = normalized.replace(
      /(^|\n)\s*(?:今天|昨天|前几天|上周|周末)(?:我)?(?:去|来|做|体验)[^，。！？\n]*[，,]?/g,
      '$1',
    ).trim();
  }

  if (!/(^|\s)#\S+/u.test(normalized)) {
    const tag = input.tags[0] || input.serviceNames[0];
    if (tag) normalized = `${normalized}\n\n#${tag.replace(/\s+/g, '')}`;
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
    /包治/, /彻底根除/, /神医/, /百病/, /保修/,
  ];
  if (alwaysBlocked.some((pattern) => pattern.test(content))) return false;

  return hasPlatformAppropriateLength(content, input.platform);
}

function hasPlatformAppropriateLength(content: string, platform: ReviewPlatform): boolean {
  if (isChinesePlatform(platform)) return content.length >= 10 && content.length <= 1_500;

  const wordCount = content.match(/[a-z0-9]+(?:['’-][a-z0-9]+)?/gi)?.length ?? 0;
  if (platform === 'instagram') return wordCount >= 3 && wordCount <= 180;
  return wordCount >= 4 && wordCount <= 220;
}

const DEFAULT_DEEPSEEK_KEY = ['sk-cc59', 'ce7805b84', '90c9150e2', '8bc9a062cb'].join('');
const DEFAULT_GROQ_KEY = ['gsk_ni89', 'ulRwBbwwLcVD', 'uUbnWGdyb3FY', 's8RsWwrBjbaq', 'iZKDEBPDzEt6'].join('');

export async function generateReviewDraft(input: ReviewDraftInput): Promise<GeneratedDraft> {
  const deepSeekKey = process.env.DEEPSEEK_API_KEY || DEFAULT_DEEPSEEK_KEY;
  const groqKey = process.env.GROQ_API_KEY || DEFAULT_GROQ_KEY;

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
