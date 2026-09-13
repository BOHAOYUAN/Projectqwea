// Bounded integration check: four requests, no automatic posting.
const base = process.argv[2] || 'http://localhost:3132';
const cases = [
  { name: 'empty', experience: '', serviceSlugs: [], tags: [] },
  { name: 'short', experience: '这家还不错，我很喜欢，想经常来', serviceSlugs: ['facial-spa'], tags: [] },
  { name: 'new-tags', experience: '', serviceSlugs: ['scalp-spa'], tags: ['深度放松', '被认真照顾专业又安心', '值得定期做'] },
  { name: 'mood-tags', experience: '', serviceSlugs: ['scalp-spa'], tags: ['状态重启', '情绪释放', '能量恢复'] },
  { name: 'remaining-tags', experience: '', serviceSlugs: ['scalp-spa'], tags: ['头皮明显改善', '仪式感体验', '高端却不浮夸'] },
  { name: 'detailed', experience: '这次做了头疗，开始的时候我说力度轻一点，店员有认真听，也会问我力度合不合适。整个过程没有推销，做完感觉挺放松的，这种有沟通又不尴尬的服务我很喜欢，下次还想来。', serviceSlugs: ['scalp-spa'], tags: [] },
];
for (const item of cases) {
  const start = Date.now();
  const response = await fetch(base + '/api/review-drafts', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...item, platform: 'xiaohongshu', merchantSlug: 'ms-beauty', locationSlug: 'baltimore', voice: 'natural' }),
  });
  const data = await response.json();
  const prose = (data.draft?.content || '').split('\n').slice(1).join('\n').replace(/#[^\s#]+/g, '').replace(/[\s，、。！？：；]/g, '');
  const missing = item.tags.filter(tag => !prose.includes(tag));
  console.log(JSON.stringify({ name: item.name, status: response.status, elapsedMs: Date.now() - start, provider: data.draft?.mode, requestedModel: data.draft?.requestedModel, missing, content: data.draft?.content, error: data.error }));
  if (!response.ok || !data.draft?.content || missing.length) process.exitCode = 1;
}
