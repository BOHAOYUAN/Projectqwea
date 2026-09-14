import { XHS_SYSTEM_PROMPT } from './xiaohongshu-prompt';
import type { GeneratedDraft, ReviewDraftInput } from './review-generator';

export function writingRange(): [number, number] {
  return [200, 300];
}

export const XHS_MODEL = 'deepseek-flash';
export const XHS_FALLBACK_MODEL = 'deepseek-v4-pro';

const tagMeanings: Record<string, RegExp[]> = {
  '状态重启': [/满血复活|重新充电|重新有了精神|精神回来|恢复状态|整个人.*焕然一新|像.*充.*电/],
  '情绪释放': [/情绪.*(放|散|舒)|心情.*(轻|舒|好|松)|烦.*(散|放|抛)|心里.*(轻|舒|散|放)/],
  '深度放松': [/彻底放松|很放松|放松.*(下来|透|到)|人.*(松|舒坦)|全身.*(松|舒)|彻底.*松/],
  '头皮明显改善': [/头皮.*(改善|舒服|清爽|好转|好.*多|舒坦)/],
  '被认真照顾专业又安心': [/(认真|细心|用心).*(照顾|对待)|被.*照顾/, /专业|靠谱|放心|安心|踏实/],
  '仪式感体验': [/仪式感|郑重.*(对待|安排)|认真.*(对待自己|安排.*自己)/],
  '值得定期做': [/定期|隔.*(来|做)|固定.*(安排|清单)|经常.*(来|做)/],
  '高端却不浮夸': [/质感|高级|讲究|高端/, /不浮夸|不张扬|不花哨|不夸张|低调/],
  '能量恢复': [/精力.*(回来|恢复)|有.*劲|充.*电|满血复活|能量.*(回来|恢复)/],
};

export function missingTags(content: string, tags: string[]): string[] {
  // Title and hashtags do not count as coverage of the customer's experience.
  const prose = content.split('\n').slice(1).join('\n').replace(/#[^\s#]+/g, '').replace(/[\s，、。！？：；]/g, '');
  return tags.filter(tag => {
    const checks = tagMeanings[tag];
    return checks ? !checks.every(check => check.test(prose)) : !prose.includes(tag);
  });
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
const filler = /不用写一大篇|简单直接说就好|最想分享的就是这个感受|脸累|脸[^。\n]*蔫|没精神|说不上哪里|我又可以了|感觉就是.{0,3}状态重启|照镜子|绷紧的心弦|后来回想起来|当下最确定的感受|内心的平静|一场心灵之旅|寻找自我/;

// This tool produces warm, positive Xiaohongshu shares for the shop. If a
// customer's raw note is frustrated, the prompt reframes it; this regex is the
// safety net that rejects a draft that still came out sounding like a 差评.
const COMPLAINT_WORDS = /差评|吐槽|生气|气到|一肚子火|差劲|太差|失望|敷衍|等了?很久|没人来?接待|答得含糊|不会再来|再也不来|不会再去|再也不会|不值|坑|骗|避雷|踩雷|劝退|糟糕|烂|对不起价格|劝大家(别|不)去|提醒大家别来|跟在家(自己)?(洗|做)|没什么(特别的)?感觉|跟没做一样|答得含糊其辞/;

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
  const [min, max] = writingRange();
  const length = Array.from(prose.replace(/\s/g, '')).length;
  const issues: string[] = [];
  if (Array.from(content).length > 1000) issues.push('整篇笔记需控制在1000字以内');
  for (const tag of missingTags(content, input.tags)) issues.push(`正文尚未表达“${tag}”的含义，请参考输入的转译方向，用口语表达，不照抄标签或只放进话题`);
  if (Array.from(title).length > 20 || !title) issues.push('标题须为完整的20字以内短句');
  if (length < (emptyExperience(input) ? 15 : min) || length > max) issues.push(`正文当前${length}字，请调整为${min}–${max}字，不加空洞总结`);
  if (!prose.includes(input.merchantName)) issues.push('正文缺少准确店名');
  if (!emptyExperience(input) && prose.split(/\n\s*\n/).length < 3) issues.push('笔记正文需要空行分成至少三段');
  const fillerMatch = (title + '\n' + prose).match(filler);
  if (fillerMatch) issues.push(`删除空洞抒情或模板用语“${fillerMatch[0]}”，不要改写成同义废话`);
  const complaintMatch = (title + '\n' + prose).match(COMPLAINT_WORDS);
  if (complaintMatch) issues.push(`这篇基调偏负面/像差评（出现“${complaintMatch[0]}”），请整体改写为放松、被照顾、做完舒服一点的暖调分享；不复述顾客的抱怨，不写“不会再来/失望/敷衍/避雷”这类表述`);
  if (emptyExperience(input) && /刷到|存个档|还没选|记下来|做完|打卡了/.test(prose)) issues.push('空输入请仅写已知门店资料，不写刷到、收藏或选择状态');
  if (/@/.test(content)) issues.push('不要输出未经选择的@账号');
  const tags = body.match(/#[^\s#]+/g) ?? [];
  if (tags.length < 3 || tags.length > 5) issues.push('末尾仅保留3–5个相关话题');
  if (/Baltimore|巴尔的摩/i.test(input.location)) {
    if (tags.some(tag => /巴尔|巴.*摩/.test(tag) && !tag.includes('巴尔的摩'))) issues.push('地名拼写错误，统一写巴尔的摩');
    if (!tags.some(tag => tag.includes('巴尔的摩'))) issues.push('至少一个话题使用准确地名巴尔的摩');
  }
  const source = input.experience + input.tags.join(' ');
  for (const [pattern, detail] of [[/香薰|香氛|香气/, '香气'], [/音乐/, '音乐'], [/手法|力度/, '手法力度'], [/水润|软糯|反光|皮肤[^，。！？\n]{0,12}滑|脸[^，。！？\n]{0,12}(滑|软)/, '皮肤触感'], [/熬夜|熬大夜|加班|工作压力|周末/, '生活背景']] as const) {
    if (pattern.test(prose) && !pattern.test(source)) issues.push(`删去未提供的${detail}，不要用新细节填补字数`);
  }
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
  const [min, max] = writingRange();
  const messages = [
    { role: 'system', content: XHS_SYSTEM_PROMPT },
    { role: 'user', content: [
      '# Input Data',
      '- 店名：' + input.merchantName,
      '- 地点：' + input.location,
      '- 服务项目：' + (input.serviceNames.map(name => name.replace(/面部\s*SPA/gi, '面部护理').replace(/头疗\s*SPA/gi, '头皮护理').replace(/背部\s*SPA/gi, '背部护理')).join('、') || '未选择'),
      '- 体验标签：' + (input.tags.join('、') || '未选择'),
      '- 平台/口吻：小红书/' + (input.voice || 'natural'),
      '- 用户真实细节：' + (input.experience || '未填写'),
      '基调要求：这是一篇暖调的到店分享/种草笔记。即使顾客原话里带不满、抱怨或情绪，也只把它写成放松、被认真照顾、做完舒服一点的正面分享；不复述抱怨，不出现差评、吐槽、不会再来、失望、敷衍、避雷、踩雷、劝退等负面词。',
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
    lastError = new Error('Xiaohongshu draft checks: ' + issues.join('; '));
    messages.push({ role: 'assistant', content }, { role: 'user', content: '请按原提示词修改这一稿：' + issues.join('；') + '。直接输出完整成稿。' });
    } catch (error) {
      lastError = error;
      // Network failures and invalid provider responses also use the backup.
    }
  }
  // Do not disguise hard-coded filler as a model result.
  console.warn('XHS generation exhausted:', lastError instanceof Error ? lastError.message : 'unknown provider error');
  throw lastError;
}
