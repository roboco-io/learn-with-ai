import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const script = resolve('scripts/release.mjs');
function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'presentation-release-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const run = (command, args, options = {}) => spawnSync(command, args, { cwd: dir, encoding: 'utf8', ...options });
  const git = (...args) => { const r = run('git', args); assert.equal(r.status, 0, r.stderr); return r.stdout.trim(); };
  git('init', '-b', 'main');
  git('config', 'user.name', 'Release Test');
  git('config', 'user.email', 'release-test@example.invalid');
  mkdirSync(join(dir, 'site'));
  writeFileSync(join(dir, 'site/content.js'), 'export const slides = [];\n');
  git('add', '.'); git('commit', '-m', 'docs: initial slides');
  const notes = join(tmpdir(), `release-notes-${dir.split('/').pop()}.txt`);
  writeFileSync(notes, '- 슬라이드 변경\n');
  t.after(() => rmSync(notes, { force: true }));
  const release = (...args) => run(process.execPath, [script, ...args]);
  const prepare = (date = '20261002') => release('prepare', '--date', date, '--notes-file', notes);
  const commit = () => { git('add', '.'); return git('commit', '-m', 'docs: prepare release'); };
  const manifest = () => JSON.parse(readFileSync(join(dir, 'site/release.js'), 'utf8').replace(/^export const release = /, '').replace(/;\s*$/, ''));
  return { dir, run, git, release, prepare, commit, manifest };
}

test('prepares matching notes and version; repeated draft preparation keeps its version', t => {
  const f = fixture(t);
  assert.equal(f.prepare().status, 0);
  assert.equal(f.manifest().version, '20261002+1');
  assert.match(readFileSync(join(f.dir, 'RELEASE_NOTES.md'), 'utf8'), /## 20261002\+1\n/);
  assert.equal(f.release('check').status, 0);
  assert.equal(f.prepare().status, 0);
  assert.equal(f.manifest().version, '20261002+1');
});

test('increments within a day, resets next day and preserves published notes', t => {
  const f = fixture(t); assert.equal(f.prepare().status, 0); f.commit();
  const first = readFileSync(join(f.dir, 'RELEASE_NOTES.md'), 'utf8');
  assert.equal(f.prepare().status, 0); assert.equal(f.manifest().version, '20261002+2'); f.commit();
  assert.equal(f.prepare('20261003').status, 0); assert.equal(f.manifest().version, '20261003+1');
  assert.ok(readFileSync(join(f.dir, 'RELEASE_NOTES.md'), 'utf8').endsWith(first.slice(first.indexOf('## '))));
  assert.notEqual(f.prepare('20260930').status, 0);
  assert.notEqual(f.prepare('20260230').status, 0);
});

test('rejects source changes made after release preparation and mismatched notes', t => {
  const f = fixture(t); assert.equal(f.prepare().status, 0);
  writeFileSync(join(f.dir, 'site/content.js'), 'export const slides = [1];\n');
  assert.notEqual(f.release('check').status, 0);
  assert.equal(f.prepare().status, 0); assert.equal(f.release('check').status, 0);
  writeFileSync(join(f.dir, 'RELEASE_NOTES.md'), '# Notes\n\n## 20261002+7\n\n- mismatch\n');
  assert.notEqual(f.release('check').status, 0);
});

test('checks the pushed commit, refuses unchanged versions and allows unrelated branches', t => {
  const f = fixture(t); const before = f.git('rev-parse', 'HEAD');
  assert.notEqual(f.release('check', '--ref', 'HEAD').status, 0);
  assert.equal(f.prepare().status, 0); f.commit(); const ready = f.git('rev-parse', 'HEAD');
  assert.equal(f.release('check', '--ref', ready, '--previous', before).status, 0);
  writeFileSync(join(f.dir, 'site/content.js'), 'uncommitted edit');
  assert.equal(f.release('check', '--ref', ready).status, 0);
  f.git('add', '.'); f.git('commit', '-m', 'docs: forgot release');
  const stale = f.git('rev-parse', 'HEAD');
  const hook = (ref, sha, remote) => f.run(process.execPath, [script, 'pre-push', 'origin'], { input: `refs/heads/main ${sha} ${ref} ${remote}\n` });
  assert.notEqual(hook('refs/heads/main', stale, ready).status, 0);
  assert.equal(hook('refs/heads/feature', stale, ready).status, 0);
  assert.equal(f.prepare().status, 0); f.commit();
  assert.equal(hook('refs/heads/main', f.git('rev-parse', 'HEAD'), ready).status, 0);
});

test('successful deployment tags prevent publishing the same version again', t => {
  const f = fixture(t); assert.equal(f.prepare().status, 0); f.commit();
  assert.equal(f.release('check', '--ref', 'HEAD', '--deployment').status, 0);
  f.git('tag', 'release-20261002+1');
  assert.notEqual(f.release('check', '--ref', 'HEAD', '--deployment').status, 0);
  assert.equal(f.prepare().status, 0); f.commit();
  assert.equal(f.release('check', '--ref', 'HEAD', '--deployment').status, 0);
});

test('uses Korea date across UTC midnight boundaries', async () => {
  const { seoulDay } = await import('./release.mjs');
  assert.equal(seoulDay(new Date('2026-10-01T14:59:59Z')), '20261001');
  assert.equal(seoulDay(new Date('2026-10-01T15:00:00Z')), '20261002');
});

test('install refuses existing hooks instead of silently disabling them', t => {
  const f = fixture(t);
  writeFileSync(join(f.dir, '.git/hooks/pre-commit'), '#!/bin/sh\nexit 0\n');
  assert.notEqual(f.release('install-hooks').status, 0);
  assert.equal(f.run('git', ['config', '--get', 'core.hooksPath']).status, 1);
});

test('real Git pre-push hook blocks stale releases and permits a prepared push', t => {
  const f = fixture(t);
  mkdirSync(join(f.dir, 'scripts'));
  mkdirSync(join(f.dir, '.githooks'));
  writeFileSync(join(f.dir, 'scripts/release.mjs'), readFileSync(script));
  writeFileSync(join(f.dir, '.githooks/pre-push'), '#!/bin/sh\nexec node scripts/release.mjs pre-push "$@"\n', { mode: 0o755 });
  assert.equal(f.release('install-hooks').status, 0);
  const remote = mkdtempSync(join(tmpdir(), 'presentation-remote-'));
  t.after(() => rmSync(remote, { recursive: true, force: true }));
  assert.equal(f.run('git', ['init', '--bare', remote]).status, 0);
  f.git('remote', 'add', 'origin', remote);
  f.git('add', '.'); f.git('commit', '-m', 'ci: install release hook');
  assert.notEqual(f.run('git', ['push', 'origin', 'main']).status, 0);
  assert.equal(f.prepare().status, 0); f.commit();
  const ready = f.git('rev-parse', 'HEAD');
  assert.equal(f.run('git', ['push', 'origin', 'main']).status, 0);
  writeFileSync(join(f.dir, 'site/content.js'), 'changed without release');
  f.git('add', '.'); f.git('commit', '-m', 'docs: forgot metadata');
  assert.notEqual(f.run('git', ['push', 'origin', 'main']).status, 0);
  assert.match(f.git('ls-remote', 'origin', 'refs/heads/main'), new RegExp(`^${ready}\\s`));
});

test('hashes submodule commit references without requiring a checkout', t => {
  const f = fixture(t);
  const first = f.git('rev-parse', 'HEAD');
  f.git('update-index', '--add', '--cacheinfo', `160000,${first},demos/example`);
  const prepared = f.prepare();
  assert.equal(prepared.status, 0, prepared.stderr);
  f.git('add', 'RELEASE_NOTES.md', 'site/release.js');
  f.git('commit', '-m', 'docs: add demo submodule');
  assert.equal(f.release('check', '--ref', 'HEAD').status, 0);
  assert.equal(f.release('check').status, 0);
  const second = f.git('rev-parse', 'HEAD');
  f.git('update-index', '--cacheinfo', `160000,${second},demos/example`);
  assert.notEqual(f.release('check').status, 0);
  assert.equal(f.prepare().status, 0);
  f.git('add', 'RELEASE_NOTES.md', 'site/release.js');
  f.git('commit', '-m', 'docs: update demo submodule');
  assert.equal(f.release('check', '--ref', 'HEAD').status, 0);
});
