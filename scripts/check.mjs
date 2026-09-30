import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { slides } from '../site/content.js';
assert.equal(slides.length, 44);
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
const html=readFileSync(new URL('../site/index.html', import.meta.url), 'utf8');
for(const [, path] of html.matchAll(/(?:src|href)="\.\/([^"#]+)"/g)) {
  assert(existsSync(new URL(`../site/${path}`, import.meta.url)), `Missing ${path}`);
}
assert(!existsSync(new URL('../site/CNAME', import.meta.url)), 'Inherit organization domain; do not claim apex');
console.log('Verified: 44 complete slides, 60-minute timing, 26 METR records, local assets and project domain setup.');
