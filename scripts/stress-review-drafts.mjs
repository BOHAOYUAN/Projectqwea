/**
 * Bounded local load check for the public review-draft endpoint.
 * Usage: node scripts/stress-review-drafts.mjs [baseUrl] [outputFile]
 */
import { writeFile } from 'node:fs/promises';

const baseUrl = process.argv[2] || 'http://localhost:3126';
const outputFile = process.argv[3];
const rounds = Number(process.env.STRESS_ROUNDS || 4);
const concurrency = Number(process.env.STRESS_CONCURRENCY || 4);

const inputs = {
  google: {
    serviceSlugs: ['facial-spa', 'scalp-spa', 'back-spa'],
    tags: ['Relaxing atmosphere', 'Thoughtful service', 'Clean space', 'Unhurried visit'],
    experience: 'I booked the facial, scalp, and back spa during one quiet afternoon. I liked having time to settle in and did not feel rushed.',
  },
  yelp: {
    serviceSlugs: ['facial-spa', 'scalp-spa', 'back-spa'],
    tags: ['Relaxing atmosphere', 'Thoughtful service', 'Clean space', 'Unhurried visit'],
    experience: 'I booked the facial, scalp, and back spa during one quiet afternoon. I liked having time to settle in and did not feel rushed.',
  },
  instagram: {
    serviceSlugs: ['facial-spa', 'scalp-spa'],
    tags: ['Relaxing atmosphere', 'Thoughtful service', 'Clean space'],
    experience: 'I came in for a facial and scalp spa after work. The pace felt calm and I could take a breath before heading home.',
  },
  xiaohongshu: {
    serviceSlugs: ['facial-spa', 'scalp-spa'],
    tags: ['肩颈松了', '终于慢下来', '没有推销', '值得再来'],
    experience: '下班后做了面部和头疗，整个过程不赶时间，坐下来以后慢慢放松下来。',
  },
};

function words(value) {
  return value.match(/[a-z0-9]+(?:['’-][a-z0-9]+)?/gi)?.length ?? 0;
}

function validate(platform, content) {
  const issues = [];
  const blocked = /\b(best|perfect|number\s*one|#1|highly recommend|great experience)\b|最好|第一|顶级|完美|宝藏店|闭眼冲|种草|好评返现|折扣/iu;
  if (blocked.test(content)) issues.push('blocked phrase');
  if (!content.toLowerCase().includes('ms beauty')) issues.push('merchant missing');

  if (platform === 'google' || platform === 'yelp') {
    const count = words(content);
    const min = platform === 'google' ? 60 : 80;
    const max = platform === 'google' ? 120 : 150;
    if (count < min || count > max) issues.push(`word count ${count}`);
    if (/#|[✨💆🤍]/u.test(content)) issues.push('disallowed formatting');
  } else if (platform === 'instagram') {
    const tags = content.match(/#[^\s#]+/g) ?? [];
    const count = words(content.replace(/#[^\s#]+/g, ' '));
    if (count < 50 || count > 100) issues.push(`word count ${count}`);
    if (tags.length < 5 || tags.length > 10) issues.push(`hashtag count ${tags.length}`);
  } else {
    const lines = content.split('\n').map((line) => line.trim()).filter(Boolean);
    const title = lines[0] ?? '';
    const tags = content.match(/#[^\s#]+/g) ?? [];
    const body = lines.slice(1).filter((line) => !line.startsWith('#')).join('');
    if ([...title].length > 20) issues.push(`title length ${[...title].length}`);
    const chineseCharacters = body.match(/[\u4e00-\u9fff]/g)?.length ?? 0;
    if (chineseCharacters < 100 || chineseCharacters > 200) issues.push(`Chinese character count ${chineseCharacters}`);
    if (tags.length < 3 || tags.length > 8) issues.push(`hashtag count ${tags.length}`);
    if (/@|MSBEAUTY_BALTIMORE/i.test(content)) issues.push('invalid Xiaohongshu mention');
    if (/我不想把.*写成|我勾选的是|发布前.*核对|按.*真实.*修改|这条笔记记录的是/.test(content)) issues.push('meta writing language');
  }
  return issues;
}

async function runOne(platform, index) {
  const startedAt = performance.now();
  const response = await fetch(`${baseUrl}/api/review-drafts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': `stress-check-${index % concurrency}` },
    body: JSON.stringify({
      platform,
      merchantSlug: 'ms-beauty',
      locationSlug: 'baltimore',
      voice: index % 3 === 0 ? 'natural' : index % 3 === 1 ? 'concise' : 'warm',
      seed: 900000 + index,
      ...inputs[platform],
    }),
  });
  const data = await response.json().catch(() => ({}));
  const content = data?.draft?.content ?? '';
  return {
    platform,
    index,
    status: response.status,
    elapsedMs: Math.round(performance.now() - startedAt),
    mode: data?.draft?.mode ?? null,
    formatIssues: content ? validate(platform, content) : ['no draft'],
    digest: content.replace(/\s+/g, ' ').trim().slice(0, 180),
    normalized: content.replace(/\s+/g, ' ').trim(),
    error: data?.error ?? null,
  };
}

async function pool(items, limit) {
  const completed = [];
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const item = items[cursor++];
      completed.push(await runOne(item.platform, item.index));
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return completed.sort((a, b) => a.index - b.index);
}

const jobs = Object.keys(inputs).flatMap((platform) =>
  Array.from({ length: rounds }, (_, round) => ({ platform, index: round * Object.keys(inputs).length + Object.keys(inputs).indexOf(platform) })),
);
const results = await pool(jobs, concurrency);
const successful = results.filter((result) => result.status === 200 && result.mode && result.formatIssues.length === 0);
const times = results.map((result) => result.elapsedMs).sort((a, b) => a - b);
const successfulContents = results.filter((result) => result.status === 200).map((result) => result.normalized);
const duplicateCount = successfulContents.length - new Set(successfulContents).size;
const report = {
  baseUrl,
  requested: results.length,
  concurrency,
  passed: successful.length,
  failed: results.length - successful.length,
  meanMs: Math.round(times.reduce((total, value) => total + value, 0) / Math.max(1, times.length)),
  p95Ms: times[Math.max(0, Math.ceil(times.length * 0.95) - 1)] ?? 0,
  duplicateCount,
  byPlatform: Object.fromEntries(Object.keys(inputs).map((platform) => [platform, {
    passed: successful.filter((result) => result.platform === platform).length,
    total: results.filter((result) => result.platform === platform).length,
  }])),
  failures: results.filter((result) => result.status !== 200 || result.formatIssues.length > 0).map((result) => {
    const publicResult = { ...result };
    delete publicResult.normalized;
    return publicResult;
  }),
  samples: results.filter((result) => result.status === 200).map((result) => {
    const publicResult = { ...result };
    delete publicResult.normalized;
    return publicResult;
  }),
};

console.log(JSON.stringify(report, null, 2));
if (outputFile) await writeFile(outputFile, JSON.stringify(report, null, 2));
if (report.failed > 0) process.exitCode = 1;
