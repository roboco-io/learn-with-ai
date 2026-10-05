import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readdirSync, readlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const metadata = new Set(['RELEASE_NOTES.md', 'site/release.js']);
const header = '# 릴리즈 노트\n\n버전: `YYYYMMDD+연번` · 날짜 기준: Asia/Seoul · 당일 연번은 1부터 시작합니다.\n배포 준비 기록이며, 성공한 배포에는 `release-버전` Git 태그가 생성됩니다.\n\n';
const hash = value => createHash('sha256').update(value).digest('hex');
function git(cwd, args, encoding = 'utf8') {
  return execFileSync('git', args, { cwd, encoding, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 32 * 1024 * 1024 });
}
function commitRef(cwd, ref) {
  if (!ref || ref.startsWith('-')) throw new Error('Invalid Git ref');
  return git(cwd, ['rev-parse', '--verify', `${ref}^{commit}`]).trim();
}
function readAt(cwd, path, ref, optional = false) {
  if (!ref) {
    if (optional && !existsSync(resolve(cwd, path))) return null;
    return readFileSync(resolve(cwd, path), 'utf8');
  }
  if (optional && spawnSync('git', ['cat-file', '-e', `${ref}:${path}`], { cwd, stdio: 'ignore' }).status !== 0) return null;
  return git(cwd, ['show', `${ref}:${path}`]);
}
function manifestAt(cwd, ref, optional = false) {
  const text = readAt(cwd, 'site/release.js', ref, optional);
  if (text === null) return null;
  if (!text.startsWith('export const release = ') || !/;\s*$/.test(text)) throw new Error('Invalid site/release.js');
  return JSON.parse(text.replace(/^export const release = /, '').replace(/;\s*$/, ''));
}
export function seoulDay(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now).replaceAll('-', '');
}
function validDay(day) {
  if (!/^\d{8}$/.test(day)) return false;
  const iso = `${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}`;
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === iso;
}
function parseVersion(version) {
  const match = /^(\d{8})\+([1-9]\d*)$/.exec(version ?? '');
  if (!match || !validDay(match[1]) || !Number.isSafeInteger(Number(match[2]))) throw new Error(`Invalid release version: ${version}`);
  return { day: match[1], serial: Number(match[2]) };
}
function newer(version, previous) {
  const a = parseVersion(version), b = parseVersion(previous);
  return a.day > b.day || (a.day === b.day && a.serial > b.serial);
}
function sourceDigest(cwd, ref) {
  const paths = ref ? git(cwd, ['ls-tree', '-r', '--name-only', '-z', ref]) : git(cwd, ['ls-files', '-z', '--cached', '--others', '--exclude-standard']);
  const entries = git(cwd, ref ? ['ls-tree', '-r', '-z', ref] : ['ls-files', '--stage', '-z']);
  const submodules = new Map();
  for (const entry of entries.split('\0').filter(Boolean)) {
    const separator = entry.indexOf('\t');
    const fields = entry.slice(0, separator).split(' ');
    if (fields[0] === '160000') submodules.set(entry.slice(separator + 1), ref ? fields[2] : fields[1]);
  }
  const digest = createHash('sha256');
  for (const path of [...new Set(paths.split('\0').filter(Boolean))].sort()) {
    if (metadata.has(path)) continue;
    let content;
    if (submodules.has(path)) content = Buffer.from(`gitlink ${submodules.get(path)}\n`);
    else if (ref) content = git(cwd, ['show', `${ref}:${path}`], null);
    else {
      let stat;
      try { stat = lstatSync(resolve(cwd, path)); } catch (error) { if (error.code === 'ENOENT') continue; throw error; }
      content = stat.isSymbolicLink() ? Buffer.from(readlinkSync(resolve(cwd, path))) : readFileSync(resolve(cwd, path));
    }
    digest.update(`${path}\0${content.length}\0`).update(content);
  }
  return digest.digest('hex');
}
function history(notes) {
  return [...notes.matchAll(/^## (\S+)\s*$/gm)].map(match => { parseVersion(match[1]); return match[1]; });
}
export function checkRelease({ cwd = process.cwd(), ref, previous, deployment = false } = {}) {
  if (ref) ref = commitRef(cwd, ref);
  const release = manifestAt(cwd, ref);
  parseVersion(release.version);
  if (release.timeZone !== 'Asia/Seoul') throw new Error('Release time zone must be Asia/Seoul');
  const notes = readAt(cwd, 'RELEASE_NOTES.md', ref);
  const versions = history(notes);
  if (versions[0] !== release.version || new Set(versions).size !== versions.length) throw new Error('Release notes and version do not match');
  for (let i = 1; i < versions.length; i++) if (!newer(versions[i - 1], versions[i])) throw new Error('Release history is not ordered');
  if (hash(notes) !== release.notesDigest) throw new Error('Release notes changed after preparation; run release prepare again');
  if (sourceDigest(cwd, ref) !== release.sourceDigest) throw new Error('Sources changed after release preparation; run release prepare again');
  if (previous && !/^0+$/.test(previous)) {
    previous = commitRef(cwd, previous);
    const old = manifestAt(cwd, previous, true);
    if (old) {
      if (!newer(release.version, old.version)) throw new Error('Every deployment needs a new version and release notes');
      const oldNotes = readAt(cwd, 'RELEASE_NOTES.md', previous);
      if (!notes.endsWith(oldNotes.slice(oldNotes.indexOf('## ')))) throw new Error('Previous release notes must remain unchanged');
    }
  }
  if (deployment && spawnSync('git', ['show-ref', '--verify', '--quiet', `refs/tags/release-${release.version}`], { cwd }).status === 0) {
    throw new Error(`${release.version} has already been deployed; prepare a new release`);
  }
  return release;
}
function prepare(cwd, options) {
  if (!options['notes-file']) throw new Error('Use prepare --notes-file /path/to/summary.txt');
  const summary = readFileSync(resolve(options['notes-file']), 'utf8').trim();
  if (!summary || !summary.split('\n').every(line => !line.trim() || /^- \S/.test(line)) || /\b(TODO|TBD)\b/.test(summary)) throw new Error('Notes must contain completed change summaries as - bullet lines');
  const day = options.date ?? seoulDay();
  if (!validDay(day)) throw new Error('Invalid release date; use YYYYMMDD');
  const head = commitRef(cwd, 'HEAD');
  const oldNotes = readAt(cwd, 'RELEASE_NOTES.md', head, true) ?? header;
  const old = manifestAt(cwd, head, true);
  const versions = history(oldNotes);
  if (old && versions[0] !== old.version) throw new Error('Committed release history is inconsistent');
  if (versions.length && day < parseVersion(versions[0]).day) throw new Error('Release date cannot move backwards');
  const serial = Math.max(0, ...versions.filter(v => parseVersion(v).day === day).map(v => parseVersion(v).serial)) + 1;
  const version = `${day}+${serial}`;
  const past = versions.length ? oldNotes.slice(oldNotes.indexOf('## ')) : '';
  const notes = `${header}## ${version}\n\n${summary}\n\n${past}`;
  const release = { version, timeZone: 'Asia/Seoul', preparedAt: new Date().toISOString(), sourceCommit: head, sourceDigest: sourceDigest(cwd), notesDigest: hash(notes) };
  writeFileSync(resolve(cwd, 'RELEASE_NOTES.md'), notes);
  writeFileSync(resolve(cwd, 'site/release.js'), `export const release = ${JSON.stringify(release, null, 2)};\n`);
  checkRelease({ cwd });
  console.log(`Prepared ${version}: RELEASE_NOTES.md and site/release.js. Review and commit both with the changes.`);
}
function prePush(cwd) {
  for (const line of readFileSync(0, 'utf8').trim().split('\n').filter(Boolean)) {
    const [, localSha, remoteRef, remoteSha] = line.split(/\s+/);
    if (remoteRef !== 'refs/heads/main' || /^0+$/.test(localSha)) continue;
    checkRelease({ cwd, ref: localSha, previous: remoteSha, deployment: true });
  }
  console.log('Release pre-push check passed.');
}
function install(cwd) {
  const current = spawnSync('git', ['config', '--get', 'core.hooksPath'], { cwd, encoding: 'utf8' }).stdout.trim();
  if (current && current !== '.githooks') throw new Error(`Existing hooksPath (${current}) must be integrated instead of overwritten`);
  const hooks = resolve(cwd, git(cwd, ['rev-parse', '--git-path', 'hooks']).trim());
  const existing = existsSync(hooks) ? readdirSync(hooks).filter(name => !name.endsWith('.sample')) : [];
  if (!current && existing.length) throw new Error(`Existing hooks (${existing.join(', ')}) must be integrated instead of disabled`);
  git(cwd, ['config', '--local', 'core.hooksPath', '.githooks']);
  console.log('Enabled repository-local .githooks/pre-push');
}
function main() {
  const [command, ...args] = process.argv.slice(2);
  const cwd = git(process.cwd(), ['rev-parse', '--show-toplevel']).trim();
  if (command === 'pre-push') return prePush(cwd);
  if (command === 'install-hooks') return install(cwd);
  const options = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--deployment') options.deployment = true;
    else if (['--ref', '--previous', '--notes-file', '--date'].includes(args[i]) && args[i + 1] && !args[i + 1].startsWith('--')) options[args[i].slice(2)] = args[++i];
    else throw new Error(`Unknown or incomplete option: ${args[i]}`);
  }
  if (command === 'prepare') return prepare(cwd, options);
  if (command === 'check') {
    const release = checkRelease({ cwd, ...options });
    console.log(`Verified release ${release.version}`);
    return;
  }
  throw new Error('Usage: node scripts/release.mjs prepare --notes-file FILE | check [--ref REF] [--previous REF] [--deployment] | install-hooks');
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { main(); } catch (error) { console.error(`Release check failed: ${error.message}\nSee .agents/skills/deploy-presentation/SKILL.md`); process.exitCode = 1; }
}
