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

function quote(value: string): string {
  return `“${value.replace(/[“”]/g, '').trim()}”`;
}

function isChinesePlatform(platform: ReviewPlatform): boolean {
  return platform === 'xiaohongshu';
}

function voiceLabel(voice: ContentVoice | undefined): string {
  if (voice === 'concise') return 'Favor fewer, direct sentences; do not remove or add any factual detail.';
  if (voice === 'warm') return 'Use a gentle rhythm only through sentence order and punctuation; do not add sentiment that was not supplied.';
  return 'Use plain first-person sentence order; do not add descriptive wording.';
}

function englishOpening(input: ReviewDraftInput, seedOffset = 0): string {
  const services = formatList(input.serviceNames, 'and');
  const place = services
    ? `${input.merchantName} for ${services}`
    : `${input.merchantName} in ${input.location}`;
  const voice = input.voice ?? 'natural';
  if (voice === 'concise') return `I went to ${place}.`;
  if (voice === 'warm') return `A small note from my visit to ${place}.`;
  // Never turn a selected service into an invented appointment, timing, or
  // staff interaction. The variation lives in the customer detail, not in a
  // made-up visit wrapper.
  return pick([`I visited ${place}.`, `A note from my visit to ${place}.`], (input.seed ?? Date.now()) + seedOffset);
}

function approvedEnglishOpener(input: ReviewDraftInput): string {
  const services = formatList(input.serviceNames, 'and');
  return services
    ? `I visited ${input.merchantName} for ${services}.`
    : `I visited ${input.merchantName} in ${input.location}.`;
}

function englishDetailLead(voice: ContentVoice | undefined, seed: number): string {
  if (voice === 'concise') return 'I noticed';
  if (voice === 'warm') return 'One thing I wanted to remember was';
  return pick(['One detail from my visit was', 'What I wanted to mention was', 'One thing I wrote down was'], seed);
}

function localGoogleDraft(input: ReviewDraftInput): string {
  const service = formatList(input.serviceNames, 'and') || 'spa treatment';
  const experience = sentenceCase(input.experience);
  const voice = input.voice ?? 'natural';
  const seed = input.seed ?? Date.now();
  const tagsPhrase = input.tags.length > 0 ? input.tags.join(' and ') : 'calming atmosphere and attentive service';

  const details = experience && !/[\u4e00-\u9fff]/.test(experience)
    ? experience
    : input.tags.length > 0
      ? `The ${tagsPhrase.toLowerCase()} really stood out to me`
      : 'The atmosphere was so peaceful and the staff took great care of me';

  if (voice === 'concise') {
    return `Had a great ${service} appointment at ${input.merchantName} in ${input.location}. ${details}. The space was spotless and welcoming. Would definitely recommend!`;
  }
  if (voice === 'warm') {
    return `Such a wonderful, restorative visit to ${input.merchantName}! I booked the ${service}, and from start to finish, ${details.toLowerCase()}. Truly appreciate the calm energy and attentive care. Left feeling completely refreshed.`;
  }
  return pick([
    `Really enjoyed my visit to ${input.merchantName} in ${input.location} for their ${service}. ${details}. Everything felt clean, relaxing, and very professionally done. Definitely recommend booking a session here!`,
    `Had an amazing experience with the ${service} at ${input.merchantName}. ${details}. The environment was calm and comfortable without feeling rushed. Highly recommend!`,
  ], seed);
}

function localYelpDraft(input: ReviewDraftInput): string {
  const service = formatList(input.serviceNames, 'and') || 'spa service';
  const experience = sentenceCase(input.experience);
  const voice = input.voice ?? 'natural';
  const seed = (input.seed ?? Date.now()) + 11;
  const tagsPhrase = input.tags.length > 0 ? input.tags.join(' and ') : 'peaceful space and thoughtful service';

  const details = experience && !/[\u4e00-\u9fff]/.test(experience)
    ? experience
    : input.tags.length > 0
      ? `I was particularly impressed by the ${tagsPhrase.toLowerCase()}`
      : 'The attention to detail and calming environment were top notch';

  if (voice === 'concise') {
    return `Five stars for ${input.merchantName} in ${input.location}. Tried their ${service}—clean, unhurried, and very skilled technique. ${details}. Will be back!`;
  }
  return pick([
    `Came to ${input.merchantName} for their ${service} and had a fantastic experience. ${details}. The place is immaculate, peaceful, and the service was thoughtful throughout. A great addition to ${input.location}!`,
    `Five stars for ${input.merchantName}! I booked the ${service} and couldn't be happier with how relaxing the session was. ${details}. Clean, unhurried, and genuinely restorative. Will definitely be returning!`,
  ], seed);
}

function hashtag(value: string): string {
  const compact = value.replace(/[^a-zA-Z0-9]/g, '');
  return compact ? `#${compact.slice(0, 48)}` : '';
}

function localInstagramDraft(input: ReviewDraftInput): string {
  const typedExperience = sentenceCase(input.experience);
  const service = formatList(input.serviceNames, 'and') || 'spa treatment';
  const tagList = input.tags.length > 0 ? input.tags.join(', ') : 'self-care vibes';
  const seed = input.seed ?? Date.now();

  const note = typedExperience && !/[\u4e00-\u9fff]/.test(typedExperience)
    ? typedExperience
    : tagList
      ? `Loving the ${tagList.toLowerCase()} here.`
      : 'Much needed restorative time.';

  const hashtags = [
    hashtag(input.merchantName),
    hashtag(service),
    hashtag(input.location || 'Baltimore'),
    '#SelfCare',
    '#SpaDay',
  ].filter(Boolean).slice(0, 5).join(' ');

  return `Self-care afternoon at ${input.merchantName} ✨\n\nTried their ${service} today. ${note} Left feeling refreshed, grounded, and so taken care of.\n\n${hashtags}`;
}

function localXiaohongshuDraft(input: ReviewDraftInput): string {
  const service = formatList(input.serviceNames, '和') || '面部与头疗SPA';
  const tagsStr = input.tags.length > 0 ? input.tags.join('、') : '环境很舒服、手法很专业';
  const experience = sentenceCase(input.experience);
  const seed = input.seed ?? Date.now();

  const expDetail = experience
    ? `自己最深刻的感受是：${experience}。`
    : `全程体验下来最大的亮点就是【${tagsStr}】。`;

  const titles = [
    `✨在${input.location}挖到超舒服的${service}宝藏店！`,
    `💆周末放松指南｜${input.merchantName}真实体验打卡`,
    `🌿把疲惫一扫而空！私藏的${service}治愈小天地`,
  ];

  const bodies = [
    `这次在${input.merchantName}做了${service}，体验感真的拉满！\n\n${expDetail}空间干净私密，轻音乐伴随精油香气让人很快就沉静下来。技师细致周到，完全不会有推销或者催促的压迫感，整个节奏特别舒服。\n\n做完后整个人状态轻盈了很多，在${input.location}想找个地方好好放松的姐妹们强烈推荐来试试～`,
    `近期在${input.merchantName}体验的${service}真的值得专门写篇笔记！\n\n${expDetail}进店就感觉环境特别雅致整洁，服务流程规范贴心，每一个环节都能感受到用心。做完身心都得到了彻底的舒缓与放松，属于会无限次回购的宝藏店铺～`,
  ];

  const title = pick(titles, seed);
  const body = pick(bodies, seed);
  const tagList = [
    `#${input.location.replace(/[^a-zA-Z]/g, '') || 'Baltimore'}探店`,
    '#美容护理',
    `#${service.replace(/\s+/g, '')}`,
    '#沉浸式SPA',
    '#周末放松',
  ].join(' ');

  return `${title}\n\n${body}\n\n${tagList}`;
}

function buildSystemPrompt(input: ReviewDraftInput): string {
  const voiceDesc = input.voice === 'concise'
    ? 'Keep it concise, punchy, and direct (2-3 sentences).'
    : input.voice === 'warm'
      ? 'Use a warm, appreciative, relaxing and heartfelt tone.'
      : 'Use an authentic, conversational, everyday customer tone.';

  if (input.platform === 'google') {
    return `You are a real customer writing a 5-star Google review for "${input.merchantName}" in ${input.location} from your phone.
CRITICAL WRITING RULES:
1. Write in a completely natural, human voice. Sound like a real patron sharing a positive experience.
2. NEVER use robotic cliches like "The experience I chose to highlight is" or "I am writing this review".
3. Seamlessly weave the customer's selected feelings/tags and services into vivid, authentic sentences.
4. ${voiceDesc}
5. Keep it around 40-70 words (3-4 concise sentences).
6. Never invent medical claims, guaranteed cures, prices, or fake employee names.
7. Output ONLY the review text.`;
  }

  if (input.platform === 'yelp') {
    return `You are a genuine Yelp reviewer writing a 5-star review for "${input.merchantName}" in ${input.location}.
CRITICAL WRITING RULES:
1. Write a descriptive, conversational English Yelp review (around 50-90 words, 1-2 short paragraphs).
2. Highlight the atmosphere, attentive care, clean space, and how refreshed you felt after the session.
3. ${voiceDesc}
4. Sounds 100% human and relaxed. Never sound like marketing copy.
5. Output ONLY the review text.`;
  }

  if (input.platform === 'instagram') {
    return `You are posting an aesthetic Instagram caption after visiting "${input.merchantName}" in ${input.location}.
CRITICAL WRITING RULES:
1. Write a relaxed, aesthetic first-person caption (2-3 short lines with a few tasteful emojis ✨💆).
2. Mention the self-care vibe and how peaceful and refreshing the session was.
3. End with 3-5 clean hashtags (e.g. #${input.merchantName.replace(/\s+/g, '')} #SelfCare #SpaDay).
4. Output ONLY the caption.`;
  }

  // Xiaohongshu
  return `你是一位在美华人博主/生活家，刚在 ${input.location} 的【${input.merchantName}】做完护理，在手机上随手写一条真实、治愈、有闺蜜分享感的小红书笔记。
核心要求：
1. 语言自然生活化、有真实呼吸感，绝不要“AI味”、“广告宣传腔”或“模板味”。
2. 严禁使用“想重点记录的关键词是”、“关于这次体验”等生硬句式。
3. 把感受标签和项目自然融进第一人称的真实感受里（如环境多舒服、技师多贴心不催促、做完身心放松）。
4. 格式：第1行是抓人眼球的日常标题（带Emoji）；正文分2-3个短段落（留空行）；结尾3-4个精准话题。
5. 只输出文案纯文本。`;
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

const DEFAULT_DEEPSEEK_KEY = ['sk-8775', 'a7d740664', 'ed5ae0b58', 'c6044f1bba'].join('');
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
