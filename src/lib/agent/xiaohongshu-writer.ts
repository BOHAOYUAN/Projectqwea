import type { GeneratedDraft, ReviewDraftInput } from './review-generator';

export function writingRange(note: string): [number, number] {
  const length = Array.from(note.replace(/\s/g, '')).length;
  if (length < 30) return [80, 120];
  if (length <= 50) return [120, 180];
  return [200, 300];
}

export const XHS_MODEL = 'deepseek-flash';
export function emptyExperience(input: ReviewDraftInput): boolean {
  return !input.experience.trim() && input.tags.length === 0;
}

export function starterNote(input: ReviewDraftInput): GeneratedDraft {
  const place = input.location.replace(/Baltimore(?:,\s*MD)?/i, '巴尔的摩');
  const subject = input.serviceNames.length ? input.serviceNames.join('、') : '门店信息';
  return { platform: 'xiaohongshu', mode: 'local', fallbackValidated: true,
    content: `${place}｜${subject}\n\n📍 ${input.merchantName}，${place}。\n\n${input.serviceNames.length ? `这篇围绕${subject}展开，` : ''}可以补充这次体验中印象最深的一点：环境、沟通，或自己的感受。\n\n#${place.replace(/\s/g, '')} #${input.merchantName.replace(/\s/g, '')} #门店分享` };
}
const filler = /不经意间|后来回想起来|不需要把|把当下|只留下|好的部分和保留的部分|真实感受写下来|过几天再回头看/;

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
  if (Array.from(title).length > 20 || !title) issues.push('标题须为完整的20字以内短句');
  if (length < (emptyExperience(input) ? 15 : min) || length > max) issues.push(`正文当前${length}字，请调整为${min}–${max}字，不加空洞总结`);
  if (!prose.includes(input.merchantName)) issues.push('正文缺少准确店名');
  if (prose.split(/\n\s*\n/).length < 2) issues.push('正文需要空行分成至少两段');
  if (filler.test(content)) issues.push('删除空洞抒情及自我解释');
  if (/@/.test(content)) issues.push('不要输出未经选择的@账号');
  const tags = body.match(/#[^\s#]+/g) ?? [];
  if (tags.length < 3 || tags.length > 5) issues.push('末尾仅保留3–5个相关话题');
  const source = input.experience + input.tags.join(' ');
  if (!/慢下来/.test(source) && /慢下来/.test(content)) issues.push('没有输入慢下来的感受');
  if (!/绷|紧/.test(source) && /绷得紧|一直绷|紧绷/.test(content)) issues.push('没有输入紧绷症状');
  if (!/香氛|香味/.test(source) && /香氛|香味/.test(content)) issues.push('没有提供香氛信息');
  if (!/环境|安静|音乐|干净|整洁/.test(source) && /环境|安静|音乐|干净|整洁/.test(prose)) issues.push('删掉未提供的环境描述');
  if (!/服务|沟通|态度|推销|店员|耐心|专业/.test(source) && /服务|沟通|态度|推销|店员|耐心|专业/.test(prose)) issues.push('删掉未提供的服务描述');
  if (!/舒服|放松|松了|松了一点|力度|手法/.test(source) && /舒服|力度|手法/.test(prose)) issues.push('删掉未提供的手法或舒服体验');
  if (!/周末|打工|低头|社恐/.test(source) && /周末|打工人|低头族|社恐/.test(content)) issues.push('不要新增顾客身份、周末或低头习惯');
  if (/一般|不满意|失望/.test(input.experience) && !/一般|中规中矩|不满意|失望|普通/.test(prose)) issues.push('保留顾客原话中的保留意见');
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
  const system = `你帮助顾客把真实体验写成第一人称中文小红书笔记，口语、具体、有重点。
${emptyExperience(input) ? '当前未提供任何体验。优先规则：写简短的门店资料分享草稿，15–120字即可，只用店名、地点及已选项目。客观介绍门店位置和已知项目；不能声称顾客来过或没来过、刷到或收藏过、做过项目或有任何好坏感受。不要解释没有选项目、说不上喜欢等系统状态。结尾留一句邀请顾客补充体验的编辑引导。不要求凑字数。' : ''}
正文${min}–${max}字（不含标题和话题）。少于30字的输入写轻量打卡，不扩写抽象情绪；30–50字写简短分享；超过50字写详细分享。重复形容词不等于多个细节。
第一行：地点或店名＋真实亮点，20字以内，不能假设首次到店。然后空行。正文2–4个短段，每段1–3句，段间空行：先亮点，再项目及感受，有服务或环境细节再写，无素材就省略该段。自然用1–3个emoji，最后另起一段3–5个精准话题。
只有用户原话、主动选择的项目和感受、门店资料能作为事实。可用生动比喻和语气词，不能新增香氛、按摩步骤、职业、周末、低头习惯、明星同款。原话优先于标签，包括负面、否定和变化程度。顾客说想再来就可以写下次再来，别机械禁止推荐。
禁止空洞抒情：不经意间、后来回想起来、不需要把…、把当下…留下来、只留下…、好的部分和保留的部分。慢下来和绷得紧仅在输入明确提及时使用一次，别扩成整段心理活动。
仅参考以下表达方法，不搬用示例事实：没有推销→“没有被推销，这点很加分✨”；想经常来→“已经想好下次再来了”；肩颈松了一点→“肩颈确实松了点😌”。不要把一点改成很多。
风格：${input.voice === 'concise' ? '短句利落' : input.voice === 'warm' ? '亲切轻松' : '日常探店分享'}。输出完整成稿，不解释写作过程，不输出@账号。
${input.avoidPhrases?.length ? '避免复用这些旧稿片段：' + JSON.stringify(input.avoidPhrases) : ''}`;
  const messages = [
    { role: 'system', content: system },
    { role: 'user', content: JSON.stringify({ 店名: input.merchantName, 地点: input.location.replace(/Baltimore(?:,\s*MD)?/i, '巴尔的摩'), 项目: input.serviceNames, 感受: input.tags, 顾客原话: input.experience }) },
  ];
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST', signal: AbortSignal.timeout(25000),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: XHS_MODEL, thinking: { type: 'disabled' }, temperature: 0.8, max_tokens: 1800, messages }),
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
    if (!issues.length) return { content, mode: 'deepseek', platform: 'xiaohongshu' };
    messages.push({ role: 'assistant', content }, { role: 'user', content: '请修改这一稿：' + issues.join('；') + `。正文写${min >= 200 ? '4个段落，每段约55–65字' : '2个段落，每段约' + Math.ceil(min / 2) + '–' + Math.floor(max / 2) + '字'}。围绕已给出的细节解释喜欢或保留意见的原因，不补新事实。标题和3–5个话题必须保留。直接输出完整成稿。` });
  }
  // Do not disguise hard-coded filler as a model result.
  throw new Error('Xiaohongshu draft needs another attempt.');
}
