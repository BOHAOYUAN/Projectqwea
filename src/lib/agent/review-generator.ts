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
  const typedExperience = sentenceCase(input.experience);
  const tag = input.tags[0];
  const opening = englishOpening(input);
  const lead = englishDetailLead(input.voice, input.seed ?? Date.now());

  // A local draft is deliberately conservative: without an LLM we preserve
  // the customer's own wording instead of inferring a benefit, a staff
  // interaction, or a detail that they did not supply.
  if (typedExperience && !/[\u4e00-\u9fff]/.test(typedExperience)) {
    return `${opening}\n\n${lead}: ${typedExperience}${typedExperience.endsWith('.') ? '' : '.'}`;
  }

  if (tag) {
    return `${opening}\n\nThe experience I chose to highlight is ${quote(tag)}.\n\nPlease add one specific detail from your own visit, then review this draft before posting.`;
  }

  return `${opening}\n\nPlease add one specific detail from your own visit before posting this review. Every customer's experience is different.`;
}

function localYelpDraft(input: ReviewDraftInput): string {
  const typedExperience = sentenceCase(input.experience);
  const tag = input.tags[0];
  const opening = englishOpening(input, 11);
  const lead = englishDetailLead(input.voice, (input.seed ?? Date.now()) + 11);

  if (typedExperience && !/[\u4e00-\u9fff]/.test(typedExperience)) {
    return `${opening}\n\n${lead}: ${typedExperience}${typedExperience.endsWith('.') ? '' : '.'}`;
  }
  if (tag) {
    return `${opening}\n\nThe part I chose to highlight is ${quote(tag)}. Please add one concrete detail from your own visit before sharing on Yelp.`;
  }
  return `${opening}\n\nPlease add a short, specific detail from your own visit before sharing on Yelp.`;
}

function hashtag(value: string): string {
  const compact = value.replace(/[^a-zA-Z0-9]/g, '');
  return compact ? `#${compact.slice(0, 48)}` : '';
}

function localInstagramDraft(input: ReviewDraftInput): string {
  const typedExperience = sentenceCase(input.experience);
  const service = formatList(input.serviceNames, 'and');
  const tag = input.tags[0];
  const opening = input.voice === 'concise'
    ? `${service || 'A visit'} at ${input.merchantName}.`
    : input.voice === 'warm'
      ? `A small note from ${service || 'my visit'} at ${input.merchantName}.`
      : pick([`A note from ${service || 'my visit'} at ${input.merchantName}.`, `${service || 'A visit'} at ${input.merchantName}.`], input.seed ?? Date.now());
  const body = typedExperience
    ? typedExperience.endsWith('.') ? typedExperience : `${typedExperience}.`
    : tag
      ? `The part I chose to highlight is ${quote(tag)}.`
      : 'Before sharing, I will add one true detail from my own visit.';
  const hashtags = [hashtag(input.merchantName), hashtag(service), hashtag(tag || '')].filter(Boolean).slice(0, 3).join(' ');

  return `${opening}\n\n${body}${hashtags ? `\n\n${hashtags}` : ''}`;
}

function localXiaohongshuDraft(input: ReviewDraftInput): string {
  const service = formatList(input.serviceNames, '和') || '护理';
  const tag = input.tags[0];
  const experience = sentenceCase(input.experience);
  const seed = input.seed ?? Date.now();
  const titles = input.voice === 'concise'
    ? [`${service}体验记录`, `今天的${service}`, `${service}小记`]
    : input.voice === 'warm'
      ? [`✨留给自己的一次${service}记录`, `🌿慢慢写下这次${service}`, `💆关于${service}的一点真实感受`]
      : [`✨${input.location}的一次${service}记录`, `🌿在${input.merchantName}记录这次${service}`, `💆${service}体验，留给自己的一条真实笔记`];
  const detail = experience
    ? `这次做的是${service}，我自己的感受是：${experience}${experience.endsWith('。') || experience.endsWith('！') || experience.endsWith('？') ? '' : '。'}`
    : `这次做的是${service}，正式发布前我会再补上一两句自己的真实感受。`;
  const tagLine = tag ? `想重点记录的关键词是：${quote(tag)}。` : '每个人的体验不一样，发布前还是要按自己的感受改一改。';

  return `${pick(titles, seed)}\n\n${detail}\n\n${tagLine}\n\n#${input.location.replace(/[^a-zA-Z]/g, '') || 'Baltimore'}探店 #美容护理 #${service.replace(/\s+/g, '')}`;
}

function buildSystemPrompt(input: ReviewDraftInput): string {
  const services = input.serviceNames.join(', ') || 'a beauty or wellness service';
  const voice = voiceLabel(input.voice);
  const sourceBoundRule = 'Act as a strict copy editor, not a creative writer. The customer experience is locked source material: preserve its visit-description clauses verbatim or nearly verbatim, correcting only punctuation or obvious grammar. Do not add, paraphrase, summarize, or infer an adjective, feeling, outcome, staff action, sensory detail, recommendation, date, reason to return, or any other experience fact. You may add only a neutral first-person opener naming the merchant and selected service, punctuation, paragraph breaks, and an exact selected tag. Do not pad a short input to reach a word count.';
  const humanStyle = 'Use plain, direct language that reads like the customer wrote it. Never use review cliches, business-brochure language, or an AI-summary tone.';
  const approvedOpener = approvedEnglishOpener(input);

  if (input.platform === 'google') {
    return `Write a Google review draft for ${input.merchantName} in ${input.location}. Use only the customer's supplied experience, service (${services}), and tags. Use one to three short paragraphs in natural American English. ${voice} ${humanStyle} ${sourceBoundRule} If you include an opener, it must be exactly: “${approvedOpener}” Do not use a title, hashtags, rating, or call to action; when an actual experience is present, it is fine to omit the tag. If the customer supplied only a service or tag, ask them to add one true detail instead of inventing a review. Output only the review.`;
  }

  if (input.platform === 'yelp') {
    return `Write a Yelp review draft for ${input.merchantName} in ${input.location}. Use only the customer's supplied experience, service (${services}), and tags. Use one or two short English paragraphs with no title, hashtags, rating, or call to action. ${voice} ${humanStyle} ${sourceBoundRule} If you include an opener, it must be exactly: “${approvedOpener}” When an actual experience is present, it is fine to omit the tag. If the customer supplied only a service or tag, ask them to add one true detail instead of inventing a review. Output only the review.`;
  }

  if (input.platform === 'instagram') {
    return `Write an Instagram caption for ${input.merchantName} in ${input.location}. Use only the customer's supplied experience, service (${services}), and tags. Use two to four short English lines, followed by up to three restrained hashtags derived only from the merchant name, supplied service, or supplied tags. It must use first person; never describe what the business offers, provides, or is known for, and never mention booking. ${voice} ${humanStyle} ${sourceBoundRule} If you include an opener, it must be exactly: “${approvedOpener}” If the customer supplied only a service or tag, ask them to add one true detail instead of inventing a caption. Output only the caption.`;
  }

  return `为 ${input.location} 的 ${input.merchantName} 写一篇小红书体验笔记。仅使用顾客提供的体验、服务（${services}）和标签。使用自然中文，写 1-3 个短段落；标题和话题标签是可选的，没有已提供的事实时宁可省略。${voice} 语气像真实顾客分享，不要模板腔、商家宣传文或 AI 总结。顾客体验原话是锁定素材：保留其中描述体验的句子，不要添加、改写、概括或推断新的感受、效果、情绪、技师、服务过程、时间、价格或到店细节；只能加中性的第一人称开头、标点、分段和原样标签。输入很短时宁可简短，也不要凑字数。若只提供项目或标签，请提醒顾客补充真实细节。只输出文案。`;
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
  const response = await fetch(provider.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${provider.apiKey}`,
    },
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

  if (!response.ok) return null;
  const data = (await response.json()) as {
    choices?: Array<{ finish_reason?: string | null; message?: { content?: string } }>;
  };
  const choice = data.choices?.[0];
  if (choice?.finish_reason === 'length') return null;
  const content = choice?.message?.content?.trim();
  return content || null;
}

async function generateWithRemoteProvider(input: ReviewDraftInput, provider: CompatibleChatProvider): Promise<string | null> {
  const system = buildSystemPrompt(input);
  const user = JSON.stringify({
    serviceNames: input.serviceNames,
    tags: input.tags,
    customerExperience: input.experience,
  });
  const temperature = isChinesePlatform(input.platform)
    ? 0.08
    : input.voice === 'concise'
      ? 0.1
      : input.voice === 'warm'
        ? 0.2
        : 0.16;

  // A strict guard occasionally rejects a model's otherwise harmless but
  // unrequested flourish. Give the provider one clean retry before using a
  // local template; only a fully source-bound result can leave this function.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const rawContent = await requestCompatibleChat(
      provider,
      system,
      user,
      temperature,
      input.platform === 'instagram' ? 240 : 420,
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

/**
 * A model sometimes adds a generic “today I…” lead in Chinese even after it
 * was told not to. It is neither a customer fact nor needed for a useful
 * draft, so remove that unsupplied temporal wrapper before the factual guard.
 * The customer's own date wording is always preserved.
 */
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

  const firstContentLine = normalized.split('\n').find((line) => line.trim())?.trim() || '';
  if (firstContentLine && (/[，。！？]/.test(firstContentLine) || firstContentLine.startsWith('#'))) {
    const titleSubject = input.serviceNames[0] || input.merchantName;
    normalized = `${titleSubject} 体验记录\n\n${normalized}`;
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
    model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
    nonThinking: true,
  };
}

/**
 * A model prompt alone is not enough for review integrity. This intentionally
 * conservative guard rejects a fluent draft if it adds common experience or
 * service claims that were not supplied. It also uses a source-vocabulary
 * allow-list, so a new claim cannot slip through simply because it was not
 * present in a deny-list. Falling back to the local template is preferable to
 * publishing an embellished review.
 */
function isGroundedRemoteDraft(content: string, input: ReviewDraftInput): boolean {
  const generated = content.toLowerCase();
  const supplied = [input.merchantName, input.location, ...input.serviceNames, ...input.tags, input.experience]
    .join(' ')
    .toLowerCase();

  const alwaysBlocked = [
    /\$\s*\d/, /\bprice\b/, /\bdiscount\b/, /\bmedical\b/, /\bdiagnos(?:e|is)\b/, /\bguarantee[ds]?\b/,
    /疗效/, /治[愈療]/, /价格/, /折扣/, /保证/, /医学/, /诊断/,
  ];
  if (alwaysBlocked.some((pattern) => pattern.test(generated))) return false;

  const englishClaimTerms = [
    'added', 'amazing', 'attention', 'attentive', 'awesome', 'beautiful', 'best', 'booked', 'booking', 'calm', 'careful', 'caring', 'clean', 'comfortable',
    'cozy', 'courteous', 'created', 'delightful', 'ease', 'eased', 'easy', 'enjoy', 'enjoyed', 'excellent', 'exceptional', 'expert',
    'explained', 'fantastic', 'feel', 'feeling', 'feels', 'felt', 'flawless', 'fresh', 'friendly', 'glow', 'glowing', 'gorgeous',
    'great', 'guided', 'healed', 'helpful', 'impressed', 'improved', 'incredible', 'informed', 'kind', 'left', 'loved', 'lovely',
    'made', 'mini retreat', 'nice', 'offer', 'offered', 'outstanding', 'pain', 'peaceful', 'perfect', 'pleasant', 'pressure', 'professional', 'provide', 'provides', 'quality',
    'recommend', 'rejuvenated', 'refresh', 'refreshed', 'relax', 'relaxed', 'relaxing', 'relief', 'restore', 'results', 'return',
    'satisfied', 'smooth', 'soothing', 'sparkling', 'spotless', 'staff', 'start to finish', 'supportive', 'team', 'technician', 'tension',
    'therapist', 'thorough', 'timely', 'today', 'tomorrow', 'took their time', 'treatment', 'unforgettable', 'warm', 'weekend', 'welcoming',
    'wellness', 'wonderful', 'worth', 'yesterday',
  ];
  const chineseClaimTerms = [
    '放松', '舒服', '专业', '干净', '氛围', '环境', '技师', '手法', '疗效', '改善', '清爽', '效果', '服务员', '店员', '老师',
    '讲解', '介绍', '耐心', '热情', '贴心', '喜欢', '推荐', '回购', '下次', '值得', '惊艳', '提升', '缓解', '细致', '安心',
    '恢复', '整个人', '心情', '状态', '疲惫', '放空', '舒缓', '放松下来', '变好', '好看', '气色', '皮肤', '头发',
    '今天', '昨天', '周末', '第一次', '上周', '下次',
  ];
  const claimTerms = isChinesePlatform(input.platform) ? chineseClaimTerms : englishClaimTerms;

  if (!claimTerms.every((term) => !generated.includes(term) || supplied.includes(term))) return false;

  // If someone took the time to describe their visit, the draft must carry at
  // least one meaningful detail from that description—not replace it with a
  // generic invitation to provide details. Selected tags and services receive
  // the same treatment when there is no free-form note.
  const hasGrounding = input.experience.trim()
    ? includesExperienceDetail(generated, input)
    : input.tags.length > 0
      ? input.tags.some((tag) => generated.includes(tag.toLowerCase()))
      : input.serviceNames.some((service) => generated.includes(service.toLowerCase()));

  return hasGrounding
    && usesOnlyGroundedVocabulary(content, input)
    && hasPlatformAppropriateLength(content, input.platform);
}

function includesExperienceDetail(generated: string, input: ReviewDraftInput): boolean {
  const experience = input.experience.toLowerCase();
  if (/[\u4e00-\u9fff]/.test(experience)) {
    const bigrams = Array.from(experience.matchAll(/[\u4e00-\u9fff]{2,}/g))
      .flatMap((match) => {
        const phrase = match[0];
        return Array.from({ length: Math.max(0, phrase.length - 1) }, (_, index) => phrase.slice(index, index + 2));
      });
    return bigrams.some((bigram) => generated.includes(bigram));
  }

  const serviceTokens = new Set(
    input.serviceNames
      .join(' ')
      .toLowerCase()
      .match(/[a-z]{4,}/g) ?? []
  );
  const stopWords = new Set(['that', 'this', 'with', 'from', 'have', 'were', 'when', 'then', 'their', 'there', 'about']);
  const detailTokens = (experience.match(/[a-z]{4,}/g) ?? []).filter(
    (word) => !serviceTokens.has(word) && !stopWords.has(word)
  );
  return detailTokens.some((word) => generated.includes(word));
}

function englishTokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[’]/g, "'")
    .match(/[a-z0-9]+(?:'[a-z0-9]+)?/g) ?? [];
}

/**
 * Remote drafts may contain a small amount of neutral connective language,
 * but all descriptive vocabulary must already appear in the customer's
 * supplied material. For Chinese, source phrases are removed as complete
 * strings before only non-factual formatting language is allowed to remain.
 */
function usesOnlyGroundedVocabulary(content: string, input: ReviewDraftInput): boolean {
  const sourceValues = [
    input.merchantName,
    input.location,
    ...input.serviceNames,
    ...input.tags,
    input.experience,
  ].map(sentenceCase).filter(Boolean);
  const sourceTokens = new Set(sourceValues.flatMap(englishTokens));
  for (const value of sourceValues) {
    const compact = value.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (compact) sourceTokens.add(compact);
  }

  // These words create only the permitted neutral shell around supplied
  // content; they must not introduce a quality, outcome, or service claim.
  const neutralEnglish = new Set([
    'a', 'add', 'an', 'and', 'at', 'before', 'caption', 'detail', 'experience', 'for',
    'from', 'i', 'in', 'is', 'it', 'my', 'note', 'of', 'on', 'one', 'only',
    'own', 'please', 'post', 'posting', 'record', 'review', 'service', 'share',
    'sharing', 'short', 'specific', 'that', 'the', 'this', 'to', 'true', 'visit', 'visited', 'with', 'your',
  ]);
  if (!englishTokens(content).every((token) => sourceTokens.has(token) || neutralEnglish.has(token))) {
    return false;
  }

  if (!isChinesePlatform(input.platform)) return true;

  let remaining = content;
  for (const value of sourceValues.sort((a, b) => b.length - a.length)) {
    remaining = remaining.replaceAll(value, '');
  }

  // Keep this list deliberately mechanical. It permits a title, punctuation,
  // and a first-person framing, but never a new feeling, benefit, or detail.
  const neutralChinese = [
    '请补充真实体验', '请补充真实细节', '体验记录', '体验小记', '真实体验',
    '发布前', '请核对', '这次', '一次', '做的是', '做了', '标题', '笔记',
    '记录', '体验', '分享', '项目', '服务', '细节', '真实', '我的', '我在',
    '我', '的', '在', '和', '与',
  ];
  for (const phrase of neutralChinese) {
    remaining = remaining.replaceAll(phrase, '');
  }
  return !/[\u4e00-\u9fff]/.test(remaining);
}

function hasPlatformAppropriateLength(content: string, platform: ReviewPlatform): boolean {
  if (isChinesePlatform(platform)) return content.length >= 10 && content.length <= 1_000;

  const wordCount = content.match(/[a-z0-9]+(?:['’-][a-z0-9]+)?/gi)?.length ?? 0;
  if (platform === 'instagram') return wordCount >= 3 && wordCount <= 120;
  return wordCount >= 4 && wordCount <= 150;
}

export async function generateReviewDraft(input: ReviewDraftInput): Promise<GeneratedDraft> {
  const deepSeekApiKey = process.env.DEEPSEEK_API_KEY;
  if (deepSeekApiKey) {
    try {
      const content = await generateWithRemoteProvider(input, deepSeekProvider(deepSeekApiKey));
      if (content) return { content, mode: 'deepseek', platform: input.platform };
    } catch {
      // A provider outage should never prevent a customer from writing their own review.
    }
  } else if (process.env.GROQ_API_KEY) {
    try {
      const content = await generateWithRemoteProvider(input, groqProvider(process.env.GROQ_API_KEY));
      if (content) return { content, mode: 'groq', platform: input.platform };
    } catch {
      // The public review flow intentionally remains available in local mode.
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
