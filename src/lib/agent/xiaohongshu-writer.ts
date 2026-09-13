import { XHS_SYSTEM_PROMPT } from './xiaohongshu-prompt';
import type { GeneratedDraft, ReviewDraftInput } from './review-generator';

export function writingRange(note: string): [number, number] {
  const length = Array.from(note.replace(/\s/g, '')).length;
  if (length < 30) return [80, 150];
  if (length < 50) return [120, 180];
  return [200, 300];
}

export const XHS_MODEL = 'deepseek-flash';
export const XHS_FALLBACK_MODEL = 'deepseek-v4-pro';

export function missingTags(content: string, tags: string[]): string[] {
  // Title and hashtags do not count as coverage of the customer's experience.
  const prose = content.split('\n').slice(1).join('\n').replace(/#[^\s#]+/g, '').replace(/[\s，、。！？：；]/g, '');
  return tags.filter(tag => !prose.includes(tag.replace(/[\s，、。！？：；]/g, '')));
}
export function emptyExperience(input: ReviewDraftInput): boolean {
  return !input.experience.trim() && input.tags.length === 0;
}

export function starterNote(input: ReviewDraftInput): GeneratedDraft {
  const place = input.location.replace(/Baltimore(?:,\s*MD)?/i, '巴尔的摩');
  const subject = input.serviceNames.length ? input.serviceNames.join('、') : '门店信息';
  return { platform: 'xiaohongshu', mode: 'local', fallbackValidated: true,
    content: `${place}｜${subject}\n\n📍 ${input.merchantName}，${place}。\n\n${input.serviceNames.length ? `这篇围绕${subject}展开，` : ''}可以补充这次体验中印象最深的一点：环境、沟通，或自己的感受。\n\n#${place.replace(/\s/g, '')} #${input.merchantName.replace(/\s/g, '')} #门店分享` };
}
const filler = /慢下来|绷紧的心弦|不需要把体验写成很大的变化|后来回想起来|当下最确定的感受|难得|不知不觉|浮躁|内心的平静|都市生活|一场心灵之旅|寻找自我/;

export function parseNote(raw: string): string {
  // Preserve blank lines and the author's title; never pad or splice prose.
  return raw.replace(/^```[^\n]*\n|\n```$/g, '').replace(/\r\n/g, '\n')
    .replace(/^#{1,3}\s+/gm, '').replace(/\*\*/g, '')
    .replace(/^标题[：:]\s*/, '').replace(/^正文[：:]\s*/m, '').trim();
}

export function noteIssues(content: string, input: ReviewDraftInput): string[] {
  const [title = '', ...rest] = content.split('\n');
  const body = rest.join('\n');
  const prose = body.replace(/#[^\s#]+/g, '').trim();
  const [min, max] = writingRange(input.experience);
  const length = Array.from(prose.replace(/\s/g, '')).length;
  const issues: string[] = [];
  for (const tag of missingTags(content, input.tags)) issues.push(`正文遗漏已选感受“${tag}”：自然写入这几个原词，并围绕它展开一句，不要只放在话题中`);
  if (Array.from(title).length > 20 || !title) issues.push('标题须为完整的20字以内短句');
  if (length < (emptyExperience(input) ? 15 : min) || length > max) issues.push(`正文当前${length}字，请调整为${min}–${max}字，不加空洞总结`);
  if (!prose.includes(input.merchantName)) issues.push('正文缺少准确店名');
  if (prose.split(/\n\s*\n/).length < 2) issues.push('正文需要空行分成至少两段');
  if (filler.test(content)) issues.push('删除空洞抒情及自我解释');
  if (emptyExperience(input) && /刷到|存个档|还没选|记下来|做完|打卡了/.test(prose)) issues.push('空输入请仅写已知门店资料，不写刷到、收藏或选择状态');
  if (/@/.test(content)) issues.push('不要输出未经选择的@账号');
  const tags = body.match(/#[^\s#]+/g) ?? [];
  if (tags.length < 3 || tags.length > 5) issues.push('末尾仅保留3–5个相关话题');
  return issues;
}

export async function writeXiaohongshu(input: ReviewDraftInput): Promise<GeneratedDraft> {
  if (emptyExperience(input)) {
    try { return await requestNote(input); } catch { return starterNote(input); }
  }
  return requestNote(input);
}

async function requestNote(input: ReviewDraftInput): Promise<GeneratedDraft> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error('Xiaohongshu writing provider is unavailable.');
  const [min, max] = writingRange(input.experience);
  const messages = [
    { role: 'system', content: XHS_SYSTEM_PROMPT },
    { role: 'user', content: [
      '# Input Data',
      '- 店名：' + input.merchantName,
      '- 地点：' + input.location,
      '- 服务项目：' + (input.serviceNames.join('、') || '未选择'),
      '- 体验标签：' + (input.tags.join('、') || '未选择'),
      '- 平台/口吻：小红书/' + (input.voice || 'natural'),
      '- 用户真实细节：' + (input.experience || '未填写'),
      '写作重点：每一个已选体验标签都必须在正文中自然出现原词，不能漏掉，也不能只列在话题里。可以加标点使语句通顺，例如“被认真照顾，专业又安心”。围绕它们串成一篇小故事，不写成标签清单。',
      '叙事节奏：开头点出最有感的体验；中间把项目、已选感受串起来；结尾写体验后的想法。两到四段，有前后衔接和情绪变化。有用户提供的工作压力、近期状态就用作开场，未提供则从体验本身开场，不编造背景、朋友推荐或具体过程。',
      '事实底线补充：上面的写作示例不是本次顾客事实。未选标签不代表体验过；不要从示例搬入没推销、皮肤变化、睡着、具体手法或环境。只对本次提供的感受换一种表达。',
      '输出格式：第一行标题（20字以内），随后正文及话题。直接输出成稿，不输出@账号。',
      emptyExperience(input) ? '没有体验素材时，生成可编辑的门店信息分享草稿，只介绍已知店名和地点，不声称刷到、到访、收藏或尚未到访，不描述表单状态，不写体验好坏。' : '本次正文目标' + min + '–' + max + '字。',
      input.avoidPhrases?.length ? '换一篇，不重复旧稿片段：' + JSON.stringify(input.avoidPhrases) : '',
    ].filter(Boolean).join('\n') },
  ];
  let lastError: unknown = new Error('Xiaohongshu draft needs another attempt.');
  for (let attempt = 0; attempt < 3; attempt++) {
    const model = attempt === 0 ? XHS_MODEL : XHS_FALLBACK_MODEL;
    try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST', signal: AbortSignal.timeout(25000),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, thinking: { type: 'disabled' }, temperature: 0.8, max_tokens: 1800, messages }),
    });
    if (!response.ok) throw new Error(`Xiaohongshu provider returned ${response.status}`);
    const result = await response.json() as { choices?: Array<{ finish_reason?: string; message?: { content?: string } }> };
    const choice = result.choices?.[0];
    let content = parseNote(choice?.message?.content ?? '');
    const [title, ...body] = content.split('\n');
    const location = input.location.replace(/Baltimore(?:,\s*MD)?/i, '巴尔的摩');
    if (Array.from(title).length > 20 && title.includes(location) && title.includes(input.merchantName)) {
      content = [title.replace(input.merchantName, '').replace(/^[\s｜|]+|[\s｜|]+$/g, '').trim(), ...body].join('\n');
    }
    const issues = noteIssues(content, input);
    if (choice?.finish_reason === 'length') issues.push('输出未完成');
    if (!issues.length) return { content, mode: 'deepseek', platform: 'xiaohongshu', requestedModel: model };
    messages.push({ role: 'assistant', content }, { role: 'user', content: '请按原提示词修改这一稿：' + issues.join('；') + '。直接输出完整成稿。' });
    } catch (error) {
      lastError = error;
      // Network failures and invalid provider responses also use the backup.
    }
  }
  // Do not disguise hard-coded filler as a model result.
  throw lastError;
}
