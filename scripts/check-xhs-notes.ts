import assert from 'node:assert/strict';
import { noteIssues } from '../src/lib/agent/xiaohongshu-writer';

async function main() {
  const base = process.argv[2] || 'http://localhost:3138';
  for (const tags of [['状态重启'], ['情绪释放', '深度放松', '能量恢复'], ['被认真照顾专业又安心', '值得定期做', '高端却不浮夸'], ['头皮明显改善', '仪式感体验'], []]) {
    const serviceSlugs = tags.includes('头皮明显改善') ? ['scalp-spa'] : ['facial-spa'];
    const start = Date.now();
    const response = await fetch(base + '/api/review-drafts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ platform: 'xiaohongshu', merchantSlug: 'ms-beauty', locationSlug: 'baltimore', tags, experience: '', serviceSlugs }) });
    const result = await response.json();
    assert.equal(response.status, 200, JSON.stringify(result));
    const issues = noteIssues(result.draft.content, { platform: 'xiaohongshu', merchantName: 'MS BEAUTY', location: 'Baltimore', tags, experience: '', serviceNames: [] });
    console.log(JSON.stringify({ tags, issues, model: result.draft.requestedModel, elapsedMs: Date.now() - start, content: result.draft.content }));
    assert.deepEqual(issues, []);
  }
}
void main();
