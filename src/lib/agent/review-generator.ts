export type ReviewPlatform = 'google' | 'xiaohongshu';

export interface ReviewDraftInput {
  platform: ReviewPlatform;
  merchantName: string;
  location: string;
  serviceNames: string[];
  tags: string[];
  experience: string;
  seed?: number;
}

export interface GeneratedDraft {
  content: string;
  mode: 'local' | 'groq';
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

function localGoogleDraft(input: ReviewDraftInput): string {
  const services = formatList(input.serviceNames, 'and');
  const typedExperience = sentenceCase(input.experience);
  const tag = input.tags[0];
  const opening = services
    ? `I visited ${input.merchantName} for ${services}.`
    : `I visited ${input.merchantName} in ${input.location}.`;

  // A local draft is deliberately conservative: without an LLM we preserve
  // the customer's own wording instead of inferring a benefit, a staff
  // interaction, or a detail that they did not supply.
  if (typedExperience && !/[\u4e00-\u9fff]/.test(typedExperience)) {
    const tagLine = tag ? ` The part I chose to highlight is ${quote(tag)}.` : '';
    return `${opening}\n\nOne detail from my visit: ${typedExperience}${typedExperience.endsWith('.') ? '' : '.'}${tagLine}\n\nPlease edit this draft so every line reflects your own experience before posting.`;
  }

  if (tag) {
    return `${opening}\n\nThe experience I chose to highlight is ${quote(tag)}.\n\nPlease add one specific detail from your own visit, then review this draft before posting.`;
  }

  return `${opening}\n\nPlease add one specific detail from your own visit before posting this review. Every customer's experience is different.`;
}

function localXiaohongshuDraft(input: ReviewDraftInput): string {
  const service = formatList(input.serviceNames, '和') || '护理';
  const tag = input.tags[0];
  const experience = sentenceCase(input.experience);
  const seed = input.seed ?? Date.now();
  const titles = [`✨${input.location}的一次${service}记录`, `🌿在${input.merchantName}记录这次${service}`, `💆${service}体验，留给自己的一条真实笔记`];
  const detail = experience
    ? `这次做的是${service}，我自己的感受是：${experience}${experience.endsWith('。') || experience.endsWith('！') || experience.endsWith('？') ? '' : '。'}`
    : `这次做的是${service}，正式发布前我会再补上一两句自己的真实感受。`;
  const tagLine = tag ? `想重点记录的关键词是：${quote(tag)}。` : '每个人的体验不一样，发布前还是要按自己的感受改一改。';

  return `${pick(titles, seed)}\n\n${detail}\n\n${tagLine}\n\n#${input.location.replace(/[^a-zA-Z]/g, '') || 'Baltimore'}探店 #美容护理 #${service.replace(/\s+/g, '')}`;
}

function buildSystemPrompt(input: ReviewDraftInput): string {
  const services = input.serviceNames.join(', ') || 'a beauty or wellness service';

  if (input.platform === 'google') {
    return `Write a Google review draft for ${input.merchantName} in ${input.location}. Use only the customer's supplied experience, service (${services}), and tags. Write natural American English in 45-75 words with 2-3 short paragraphs. Sound specific, warm, and human; vary sentence rhythm. Every factual or evaluative phrase must come directly from the customer's words or a selected tag: do not turn a tag into additional sensory detail. Do not infer an outcome, a mood change, a reason to return, staff behavior, pressure, cleanliness, a price, a medical claim, a guaranteed result, an unprovided fact, or a star rating. If the customer supplied only a service/tag, ask them to add one true detail before posting. Output only the review.`;
  }

  return `为 ${input.location} 的 ${input.merchantName} 写一篇小红书体验笔记。仅使用顾客提供的体验、服务（${services}）和标签。使用自然中文，写一个带 Emoji 的标题、3 个短段落和 3-4 个相关话题标签。语气像真实顾客分享，不要模板腔。每一个描述体验、感受或效果的表达都必须直接来自顾客原话或所选标签；不能由标签推演出新的细节。不得虚构疗效、价格、技师姓名、到店细节、情绪变化、回购意愿或未提供的事实。若只提供了项目或标签，请提醒顾客补充真实细节。只输出文案。`;
}

async function generateWithGroq(input: ReviewDraftInput, apiKey: string): Promise<string | null> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || process.env.DEFAULT_MODEL || 'openai/gpt-oss-120b',
      temperature: 0.82,
      messages: [
        { role: 'system', content: buildSystemPrompt(input) },
        {
          role: 'user',
          content: JSON.stringify({
            serviceNames: input.serviceNames,
            tags: input.tags,
            customerExperience: input.experience,
          }),
        },
      ],
    }),
  });

  if (!response.ok) return null;
  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) return null;

  if (input.platform === 'google' && /[\u4e00-\u9fff]/.test(content)) return null;
  if (input.platform === 'xiaohongshu' && !/[\u4e00-\u9fff]/.test(content)) return null;
  if (!isGroundedGroqDraft(content, input)) return null;
  return content;
}

/**
 * A model prompt alone is not enough for review integrity. This intentionally
 * conservative guard rejects a fluent draft if it adds common experience or
 * service claims that were not supplied. Falling back to the local template
 * is preferable to publishing an embellished review.
 */
function isGroundedGroqDraft(content: string, input: ReviewDraftInput): boolean {
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
    'added', 'amazing', 'awesome', 'beautiful', 'best', 'calm', 'comfortable', 'clean', 'cozy', 'created', 'ease', 'eased',
    'enjoy', 'enjoyed', 'fantastic', 'friendly', 'glow', 'glowing', 'great', 'healed', 'improved', 'incredible', 'left', 'lovely',
    'mini retreat', 'pain', 'peaceful', 'perfect', 'pressure', 'professional', 'recommend', 'refresh',
    'refreshed', 'relax', 'relaxed', 'relaxing', 'relief', 'restore', 'results', 'return', 'soothing',
    'staff', 'team', 'technician', 'therapist', 'tension', 'treatment', 'welcoming', 'wonderful', 'worth',
  ];
  const chineseClaimTerms = [
    '放松', '舒服', '专业', '干净', '氛围', '环境', '技师', '手法', '疗效', '改善', '清爽', '效果',
    '治愈', '喜欢', '推荐', '回购', '下次', '值得', '惊艳', '提升', '缓解', '细致', '安心', '恢复', '整个人', '心情', '状态', '疲惫',
  ];
  const claimTerms = input.platform === 'google' ? englishClaimTerms : chineseClaimTerms;

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

  return hasGrounding && usesOnlyGroundedVocabulary(content, input);
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

function usesOnlyGroundedVocabulary(content: string, input: ReviewDraftInput): boolean {
  const supplied = [input.merchantName, input.location, ...input.serviceNames, ...input.tags, input.experience]
    .join(' ')
    .toLowerCase();
  const sourceWords = new Set(supplied.match(/[a-z]{3,}/g) ?? []);
  const neutralEnglish = new Set([
    'add', 'all', 'and', 'any', 'are', 'as', 'at', 'before', 'based', 'by', 'can', 'chose', 'customer',
    'detail', 'details', 'draft', 'each', 'edit', 'every', 'for', 'from', 'highlight', 'i', 'in', 'is', 'it',
    'line', 'lines', 'my', 'note', 'of', 'on', 'only', 'one', 'own', 'please', 'post', 'posting', 'read',
    'reflect', 'reflects', 'review', 'service', 'share', 'sharing', 'so', 'that', 'the', 'this', 'to', 'true',
    'visit', 'visited', 'was', 'what', 'with', 'words', 'you', 'your',
  ]);
  const generatedWords = content.toLowerCase().match(/[a-z]{3,}/g) ?? [];
  if (!generatedWords.every((word) => sourceWords.has(word) || neutralEnglish.has(word))) return false;

  if (!/[\u4e00-\u9fff]/.test(content)) return true;

  // Chinese does not have whitespace word boundaries. Remove the exact source
  // fragments plus a small set of neutral editorial connectors; any remaining
  // Chinese content is a model-added claim and is rejected.
  let remaining = content;
  const literalFacts = [input.merchantName, input.location, ...input.serviceNames, ...input.tags, input.experience]
    .filter(Boolean)
    .sort((left, right) => right.length - left.length);
  for (const fact of literalFacts) remaining = remaining.replaceAll(fact, '');
  const neutralChinese = [
    '标题', '记录', '一次', '这次', '在', '体验了', '我自己的感受是', '想重点记录的关键词是',
    '发布前请按实际体验补充和修改', '请补充真实细节', '发布前请核对', '真实', '细节', '发布前',
    '发布', '体验', '服务', '项目', '探店', '美容护理', '和', '、', '：', '。', '！', '？',
  ];
  for (const phrase of neutralChinese) remaining = remaining.replaceAll(phrase, '');
  return !/[\u4e00-\u9fff]/.test(remaining);
}

export async function generateReviewDraft(input: ReviewDraftInput): Promise<GeneratedDraft> {
  const apiKey = process.env.GROQ_API_KEY;

  if (apiKey) {
    try {
      const content = await generateWithGroq(input, apiKey);
      if (content) return { content, mode: 'groq', platform: input.platform };
    } catch {
      // The public review flow intentionally remains available in local mode.
    }
  }

  const content = input.platform === 'google' ? localGoogleDraft(input) : localXiaohongshuDraft(input);
  return { content, mode: 'local', platform: input.platform };
}

export async function generateMerchantReply(input: {
  platform: ReviewPlatform;
  merchantName: string;
  reviewText: string;
  tone: string;
}): Promise<GeneratedDraft> {
  const fallback = input.platform === 'google'
    ? `Thank you for taking the time to share your feedback. We appreciate hearing about your experience and will keep your comments in mind.`
    : `谢谢你认真分享这次体验。我们很珍惜每一条反馈，也会继续把服务细节做好。`;
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) return { content: fallback, mode: 'local', platform: input.platform };

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || process.env.DEFAULT_MODEL || 'openai/gpt-oss-120b',
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: `Write a concise ${input.platform === 'google' ? 'English' : 'Chinese'} merchant reply for ${input.merchantName}. Tone: ${input.tone}. Be warm and human, mention only what is in the review, never make medical claims or promise discounts. Output only the reply.`,
          },
          { role: 'user', content: input.reviewText },
        ],
      }),
    });
    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (response.ok && content) return { content, mode: 'groq', platform: input.platform };
  } catch {
    // Local fallback remains usable while Groq is unavailable.
  }

  return { content: fallback, mode: 'local', platform: input.platform };
}
