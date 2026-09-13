import { xhsPublishDestination, XHS_APP_PUBLISH_URL, XHS_WEB_PUBLISH_URL } from '../src/lib/xiaohongshu-publishing';
import { XHS_EXPERIENCE_TAGS, XHS_SYSTEM_PROMPT } from '../src/lib/agent/xiaohongshu-prompt';
import assert from 'node:assert/strict';
import { writingRange, parseNote, noteIssues, writeXiaohongshu } from '../src/lib/agent/xiaohongshu-writer';

async function main() {
  assert.equal(XHS_EXPERIENCE_TAGS.length, 9);
  assert.equal(xhsPublishDestination('iPhone'), XHS_APP_PUBLISH_URL);
  assert.equal(xhsPublishDestination('Android'), XHS_APP_PUBLISH_URL);
  assert.equal(xhsPublishDestination('Windows'), XHS_WEB_PUBLISH_URL);
  assert(XHS_SYSTEM_PROMPT.includes('真实、随性、口语化'));

  assert.deepEqual(writingRange('好'.repeat(29)), [80, 150]);
  assert.deepEqual(writingRange('好'.repeat(30)), [120, 180]);
  assert.deepEqual(writingRange('好'.repeat(50)), [200, 300]);
  assert.deepEqual(writingRange('好'.repeat(51)), [200, 300]);
  const content = '标题\n\n第一段。\n\n第二段。\n\n#标签';
  assert.equal(parseNote(content), content);
  const input = { platform: 'xiaohongshu' as const, merchantName: 'MS BEAUTY', location: 'Baltimore', serviceNames: ['面部SPA'], tags: [], experience: '很喜欢' };
  assert(noteIssues('标题\n\nMS BEAUTY环境安静，香氛好闻。\n\n后来回想起来。', input).some(x => x.includes('抒情')));
  const original = globalThis.fetch;
  const previousKey = process.env.DEEPSEEK_API_KEY;
  process.env.DEEPSEEK_API_KEY = 'test-only';
  globalThis.fetch = async () => new Response('{}', { status: 503 });
  try {
    await assert.rejects(writeXiaohongshu(input), /503/);
    const empty = await writeXiaohongshu({ ...input, experience: '', tags: [], serviceNames: [] });
    assert(empty.content.includes('MS BEAUTY'));
    assert.equal(empty.fallbackValidated, true);
    assert(!empty.content.includes('做完'));
  } finally {
    globalThis.fetch = original;
    if (previousKey === undefined) delete process.env.DEEPSEEK_API_KEY;
    else process.env.DEEPSEEK_API_KEY = previousKey;
  }
  console.log('PASS: length boundaries, paragraphs, prompt, publishing destinations, blacklist, empty-input fallback');
}
void main();
