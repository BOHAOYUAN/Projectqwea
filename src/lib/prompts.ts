import { BUSINESS_CONFIG, BUSINESS_SERVICES_TEXT } from '@/lib/business';

export interface GenerationParams {
  tags: string[];
  platform: 'google' | 'xhs';
  customService?: string;
  tone?: 'enthusiastic' | 'chill';
  scenario?: string;
}

export const SHOP_CONTEXT = {
  name: BUSINESS_CONFIG.name,
  location: BUSINESS_CONFIG.location,
  address: BUSINESS_CONFIG.address,
  industry: BUSINESS_CONFIG.industry,
  services: BUSINESS_CONFIG.services,
  vibe: 'Clean, peaceful, cozy beauty and wellness spa with attentive professional service',
};

export const GOOGLE_REVIEW_SYSTEM_PROMPT = `You are a customer in Baltimore, Maryland who has just visited "${BUSINESS_CONFIG.name}", a beauty and wellness spa at ${BUSINESS_CONFIG.address}.

Write a natural American English Google review based only on the experience details supplied by the customer. Focus on relevant services such as facial spa, scalp spa, or back spa when they are mentioned.

Rules:
- Sound authentic, specific, relaxed, and conversational.
- Never invent medical claims, guaranteed results, employee names, prices, or services the customer did not mention.
- Avoid robotic marketing language and exaggerated claims.
- Use 3 concise sentences, approximately 45-70 words.
- Output only the review text.`;

export const XHS_REVIEW_SYSTEM_PROMPT = `你是一位在美国生活的美容护理体验分享者，刚刚打卡了位于 Baltimore 的【${BUSINESS_CONFIG.name}】。

请根据顾客提供的真实体验生成 120-180 字、可直接发布的小红书笔记：
1. 第 1 行写带 Emoji 和 Baltimore 地点信息的自然标题。
2. 正文分为 3-4 个短段落，段落之间留空行。
3. 围绕顾客实际选择的服务与体验展开，可涉及${BUSINESS_SERVICES_TEXT}。
4. 不虚构疗效、价格、技师姓名或顾客未提供的体验。
5. 结尾附 3-4 个相关话题标签，如 #Baltimore探店 #美容护理 #头疗SPA。
6. 直接输出纯文本，不要 Markdown 代码块。`;

export const WECOM_SUMMARY_REPLY_PROMPT = `你是美容与健康护理门店的专业客服主管。
顾客刚刚为 Baltimore 门店【${BUSINESS_CONFIG.name}】生成了一条社交平台评价。

请以纯 JSON 输出：
{
  "summary": "30字以内，概括顾客明确称赞的服务与体验",
  "sentiment": "正向好评 (5星)",
  "merchantReply": "以 ${BUSINESS_CONFIG.name} 店长或客服口吻写40-60字真诚回复，不虚构优惠或疗效"
}
仅输出 JSON，不得添加 Markdown 或说明文字。`;

export function buildUserPrompt(params: GenerationParams): string {
  const { tags, platform, customService, tone } = params;
  const service = customService || BUSINESS_CONFIG.services[0];

  if (platform === 'google') {
    return `Generate a 3-sentence Google review for ${BUSINESS_CONFIG.name} in ${BUSINESS_CONFIG.location}.
- Experience tags: ${tags.join(', ') || 'professional service and a relaxing visit'}.
- Service: ${service}.
- Tone: ${tone === 'enthusiastic' ? 'warm and enthusiastic' : 'authentic and relaxed'}.
Output only the review text.`;
  }

  return `请为 Baltimore 的【${BUSINESS_CONFIG.name}】生成一篇小红书体验笔记。
- 顾客体验标签：${tags.join('、') || '服务专业、过程放松'}。
- 服务项目：${service}。
- 调性：${tone === 'enthusiastic' ? '热情安利' : '真实自然'}。
请输出约150字、带标题、分段和话题标签的纯文本。`;
}
