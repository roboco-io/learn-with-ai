import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { slides } from '../site/content.js';
import { fitExponentialTrend } from '../site/trend.js';
import { checkRelease } from './release.mjs';
import { fileURLToPath } from 'node:url';
assert.equal(slides.length, 49);
assert.equal(slides.reduce((sum, s) => sum + s.minutes, 0), 60);
for (const s of slides) {
  assert(s.title && s.body && s.notes && s.chapter, 'Incomplete slide');
  assert(!/TODO|TBD/.test(s.body + s.notes));
  for (const [, url] of s.refs) assert.equal(new URL(url).protocol, 'https:');
}
const data = JSON.parse(readFileSync(new URL('../site/data/metr.json', import.meta.url)));
assert.equal(data.benchmark, 'METR-Horizon-v1.1');
assert.equal(data.models.length, 26);
assert.equal(new Set(data.models.map(m => m.id)).size, 26);
for (const m of data.models) {
  assert(m.ci_low > 0 && m.ci_low <= m.estimate && m.estimate <= m.ci_high);
  assert(Number.isFinite(Date.parse(m.date)));
}
// A known ten-day doubling series checks the regression independently of the display.
const syntheticTrend = fitExponentialTrend([
  { date: '2024-01-01', estimate: 2 },
  { date: '2024-01-11', estimate: 4 },
  { date: '2024-01-21', estimate: 8 },
  { date: '2023-12-31', estimate: 500 },
  { date: '2024-02-01', estimate: 1000 },
  { date: '2999-01-01', estimate: 100 },
]);
assert.equal(syntheticTrend.count, 3);
assert(Math.abs(syntheticTrend.doublingDays - 10) < 1e-8);
assert(Math.abs(syntheticTrend.valueAt(Date.parse('2024-01-06')) - Math.sqrt(8)) < 1e-8);
assert.equal(fitExponentialTrend([{ date: '2024-01-01', estimate: 2 }]), null);
assert.equal(fitExponentialTrend([{ date: '2024-01-01', estimate: 2 }, { date: '2024-01-01', estimate: 4 }]), null);
const trend = fitExponentialTrend(data.models);
assert(trend && trend.doublingDays > 0);
assert.equal(trend.count, 20);
assert.equal(trend.start, Date.parse('2024-03-04'));
assert.equal(trend.end, Date.parse('2026-03-05'));
assert.equal(trend.displayEnd, Date.parse('2026-04-07'));
assert(trend.valueAt(trend.displayEnd) > trend.valueAt(trend.end));
assert(trend.valueAt(trend.end) > trend.valueAt(trend.start));
const html=readFileSync(new URL('../site/index.html', import.meta.url), 'utf8');
for(const [, path] of html.matchAll(/(?:src|href)="\.\/([^"#]+)"/g)) {
  assert(existsSync(new URL(`../site/${path}`, import.meta.url)), `Missing ${path}`);
}
assert(!existsSync(new URL('../site/CNAME', import.meta.url)), 'Inherit organization domain; do not claim apex');
console.log('Verified: 49 complete slides, 60-minute timing, 26 METR records, local assets and project domain setup.');

const release = checkRelease({ cwd: fileURLToPath(new URL('..', import.meta.url)) });
console.log(`Verified release notes, version and source snapshot: ${release.version}`);
