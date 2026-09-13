import assert from 'node:assert/strict';
import { writingRange, parseNote, noteIssues, writeXiaohongshu } from '../src/lib/agent/xiaohongshu-writer';

async function main() {
  assert.deepEqual(writingRange('好'.repeat(29)), [80, 120]);
  assert.deepEqual(writingRange('好'.repeat(30)), [120, 180]);
  assert.deepEqual(writingRange('好'.repeat(50)), [120, 180]);
  assert.deepEqual(writingRange('好'.repeat(51)), [200, 300]);
  const content = '标题\n\n第一段。\n\n第二段。\n\n#标签';
  assert.equal(parseNote(content), content);
  const input = { platform: 'xiaohongshu' as const, merchantName: 'MS BEAUTY', location: 'Baltimore', serviceNames: ['面部SPA'], tags: [], experience: '很喜欢' };
  assert(noteIssues('标题\n\nMS BEAUTY环境安静，香氛好闻。\n\n后来回想起来。', input).some(x => x.includes('环境')));
  const original = globalThis.fetch;
  const previousKey = process.env.DEEPSEEK_API_KEY;
  process.env.DEEPSEEK_API_KEY = 'test-only';
  globalThis.fetch = async () => new Response('{}', { status: 503 });
  try {
    await assert.rejects(writeXiaohongshu(input), /503/);
  } finally {
    globalThis.fetch = original;
    if (previousKey === undefined) delete process.env.DEEPSEEK_API_KEY;
    else process.env.DEEPSEEK_API_KEY = previousKey;
  }
  console.log('PASS: length boundaries, paragraphs, unsupported details, provider errors never become template drafts');
}
void main();
