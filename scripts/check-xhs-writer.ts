import { xhsPublishDestination, XHS_APP_PUBLISH_URL, XHS_WEB_PUBLISH_URL } from '../src/lib/xiaohongshu-publishing';
import { XHS_EXPERIENCE_TAGS, XHS_SYSTEM_PROMPT } from '../src/lib/agent/xiaohongshu-prompt';
import assert from 'node:assert/strict';
import { writingRange, parseNote, noteIssues, writeXiaohongshu, missingTags, XHS_MODEL, XHS_FALLBACK_MODEL } from '../src/lib/agent/xiaohongshu-writer';

async function main() {
  assert.equal(XHS_EXPERIENCE_TAGS.length, 9);
  assert.equal(xhsPublishDestination('iPhone'), XHS_APP_PUBLISH_URL);
  assert.equal(xhsPublishDestination('Android'), XHS_APP_PUBLISH_URL);
  assert.equal(xhsPublishDestination('Windows'), XHS_WEB_PUBLISH_URL);
  assert(XHS_SYSTEM_PROMPT.includes('真实、随性、口语化'));
  assert.deepEqual(missingTags('深度放松\n\n正文\n\n#深度放松', ['深度放松']), ['深度放松']);
  for (const tag of XHS_EXPERIENCE_TAGS) assert.deepEqual(missingTags('标题\n\n'+tag, [tag]), []);

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
    const models: string[] = [];
    const good = '巴尔的摩体验分享\n\n在MS BEAUTY体验后，最想说的是深度放松。这是我这次很在意的感受，用这几个字形容就很合适，不用再加别的形容。\n\n对我来说，这次体验留下的印象很直接：深度放松。有这样的感受，才想写下来分享给大家，也留作自己的一次记录。\n\n#巴尔的摩 #MSBEAUTY #体验分享';
    const tagged = { ...input, tags: ['深度放松'] };
    assert.deepEqual(noteIssues(good, tagged), []);
    for (const first of ['network', 'missing-tag', 'truncated']) {
      models.length = 0;
      globalThis.fetch = async (_url, options) => {
        models.push(JSON.parse(String(options?.body)).model);
        if (models.length === 1 && first === 'network') throw new Error('network');
        const content = models.length === 1 && first === 'missing-tag' ? good.replaceAll('深度放松', '很舒服') : good;
        return Response.json({ choices: [{ finish_reason: models.length === 1 && first === 'truncated' ? 'length' : 'stop', message: { content } }] });
      };
      const result = await writeXiaohongshu(tagged);
      assert.deepEqual(models, [XHS_MODEL, XHS_FALLBACK_MODEL]);
      assert.equal(result.requestedModel, XHS_FALLBACK_MODEL);
    }
  } finally {
    globalThis.fetch = original;
    if (previousKey === undefined) delete process.env.DEEPSEEK_API_KEY;
    else process.env.DEEPSEEK_API_KEY = previousKey;
  }
  console.log('PASS: length boundaries, paragraphs, prompt, publishing destinations, blacklist, empty-input fallback');
}
void main();
