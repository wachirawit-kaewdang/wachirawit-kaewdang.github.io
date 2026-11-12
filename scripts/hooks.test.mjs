// Tests for the git hooks' phone scan (scripts/check-phone.mjs), run against a throwaway repo.
// The number is assembled at run time from made-up digits, so no phone-shaped text is in this file.
// Run: npm test
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { after, before, test } from 'node:test';
import { decodeText, phonesIn } from './checks/phone.mjs';

const script = resolve(import.meta.dirname, 'check-phone.mjs');
const number = ['089', '765', '4321'].join('-');
let repo;
const git = (...args) => execFileSync('git', args, { cwd: repo, stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();
const scan = (args, input = '') => spawnSync(process.execPath, [script, ...args], { cwd: repo, input, encoding: 'utf8' });

before(() => {
  repo = mkdtempSync(join(tmpdir(), 'hooks-test-'));
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');
  writeFileSync(join(repo, 'notes.txt'), 'nothing here\n');
  git('add', '.');
  git('commit', '-q', '-m', 'start');
});
after(() => rmSync(repo, { recursive: true, force: true }));

test('the staged scan stops a number in a staged file, even one saved as UTF-16', () => {
  writeFileSync(join(repo, 'utf16.txt'), Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(`call ${number}\n`, 'utf16le')]));
  git('add', 'utf16.txt');
  const result = scan(['--staged']);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /utf16\.txt/);
  git('rm', '-q', '--cached', 'utf16.txt');
});

test('the staged scan passes a clean commit', () => {
  writeFileSync(join(repo, 'clean.txt'), 'F1 0.707 and 0.5469\n');
  git('add', 'clean.txt');
  assert.equal(scan(['--staged']).status, 0);
  git('commit', '-q', '-m', 'clean');
});

test('the message scan stops a number in a commit message', () => {
  const message = join(repo, 'MSG');
  writeFileSync(message, `fix: call ${number}\n`);
  assert.equal(scan(['--message', message]).status, 1);
  rmSync(message);
});

test('the push scan stops a commit made with --no-verify, and names it', () => {
  const base = git('rev-parse', 'HEAD');
  writeFileSync(join(repo, 'leak.txt'), `Tel.${number}\n`);
  git('add', 'leak.txt');
  git('commit', '-q', '--no-verify', '-m', 'oops');
  const head = git('rev-parse', 'HEAD');
  const result = scan(['--push'], `refs/heads/main ${head} refs/heads/main ${base}\n`);
  assert.equal(result.status, 1);
  assert.match(result.stderr, new RegExp(`leak\\.txt in ${head.slice(0, 7)}`));
  git('reset', '-q', '--hard', base);
});

test('the push scan reads a merge commit, where a conflict fix can add a number', () => {
  const base = git('rev-parse', 'HEAD');
  git('checkout', '-q', '-b', 'side');
  writeFileSync(join(repo, 'side.txt'), 'side work\n');
  git('add', 'side.txt');
  git('commit', '-q', '-m', 'side');
  git('checkout', '-q', 'main');
  writeFileSync(join(repo, 'main.txt'), 'main work\n');
  git('add', 'main.txt');
  git('commit', '-q', '-m', 'main');
  git('merge', '-q', '--no-commit', '--no-ff', 'side');
  writeFileSync(join(repo, 'main.txt'), `main work, call ${number}\n`);
  git('add', 'main.txt');
  git('commit', '-q', '--no-verify', '-m', 'merge side');
  const head = git('rev-parse', 'HEAD');
  const result = scan(['--push'], `refs/heads/main ${head} refs/heads/main ${base}\n`);
  assert.equal(result.status, 1);
  assert.match(result.stderr, new RegExp(`main\\.txt in ${head.slice(0, 7)}`));
  git('reset', '-q', '--hard', base);
  git('branch', '-q', '-D', 'side');
});

test('the staged scan stops a file it cannot read unless it is tied by hash', () => {
  writeFileSync(join(repo, 'shot.jpg'), Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16]));
  git('add', 'shot.jpg');
  const result = scan(['--staged']);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /shot\.jpg can't be scanned/);
  git('rm', '-q', '--cached', 'shot.jpg');
  rmSync(join(repo, 'shot.jpg'));
});

test('a new branch is compared only with the remote it goes to, not with any remote', () => {
  const base = git('rev-parse', 'HEAD');
  writeFileSync(join(repo, 'backup.txt'), `call ${number}\n`);
  git('add', 'backup.txt');
  git('commit', '-q', '--no-verify', '-m', 'only on the backup remote');
  const head = git('rev-parse', 'HEAD');
  git('update-ref', 'refs/remotes/backup/main', head);
  const result = scan(['--push', 'origin'], `refs/heads/feature ${head} refs/heads/feature ${'0'.repeat(40)}\n`);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /backup\.txt/);
  git('update-ref', '-d', 'refs/remotes/backup/main');
  git('reset', '-q', '--hard', base);
});

test('each commit in a push is checked against its own pinned hashes', () => {
  const base = git('rev-parse', 'HEAD');
  const pin = (bytes) => {
    const hash = createHash('sha256').update(bytes).digest('hex');
    mkdirSync(join(repo, 'scripts/checks'), { recursive: true });
    mkdirSync(join(repo, 'public'), { recursive: true });
    writeFileSync(join(repo, 'public/og-image.png'), bytes);
    writeFileSync(join(repo, 'scripts/checks/pins.mjs'), `export const pinnedFiles = {\n  "og-image.png": "${hash}"\n};\n`);
    git('add', 'public/og-image.png', 'scripts/checks/pins.mjs');
    git('commit', '-q', '--no-verify', '-m', 'image');
  };
  pin(Buffer.from([0x89, 0x50, 0x4e, 0x47, 1]));
  pin(Buffer.from([0x89, 0x50, 0x4e, 0x47, 2]));
  const head = git('rev-parse', 'HEAD');
  assert.equal(scan(['--push'], `refs/heads/main ${head} refs/heads/main ${base}\n`).status, 0);
  // An image that no longer matches the hash its own commit pinned is still stopped.
  writeFileSync(join(repo, 'public/og-image.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47, 3]));
  git('add', 'public/og-image.png');
  git('commit', '-q', '--no-verify', '-m', 'swapped image');
  const swapped = git('rev-parse', 'HEAD');
  const result = scan(['--push'], `refs/heads/main ${swapped} refs/heads/main ${base}\n`);
  assert.equal(result.status, 1);
  assert.match(result.stderr, new RegExp(`og-image\\.png in ${swapped.slice(0, 7)} doesn't match`));
  git('reset', '-q', '--hard', base);
});

test('the pinned-hash reader accepts single quotes, and fails loudly when it finds no entries', () => {
  const base = git('rev-parse', 'HEAD');
  const image = Buffer.from([0x89, 0x50, 0x4e, 0x47, 7]);
  const hash = createHash('sha256').update(image).digest('hex');
  const commitPins = (text, message) => {
    mkdirSync(join(repo, 'scripts/checks'), { recursive: true });
    mkdirSync(join(repo, 'public'), { recursive: true });
    writeFileSync(join(repo, 'public/og-image.png'), image);
    writeFileSync(join(repo, 'scripts/checks/pins.mjs'), text);
    git('add', 'public/og-image.png', 'scripts/checks/pins.mjs');
    git('commit', '-q', '--no-verify', '-m', message);
    return scan(['--push'], `refs/heads/main ${git('rev-parse', 'HEAD')} refs/heads/main ${base}\n`);
  };
  // Single quotes are read as well as double: a changed image against its pin is still caught.
  const wrong = '0'.repeat(64);
  const single = commitPins(`export const pinnedFiles = {\n  'og-image.png': '${wrong}',\n};\n`, 'single quotes');
  assert.equal(single.status, 1);
  assert.match(single.stderr, /og-image\.png in [0-9a-f]{7} doesn't match its pinned hash/);
  git('reset', '-q', '--hard', base);
  assert.equal(commitPins(`export const pinnedFiles = {\n  'og-image.png': '${hash}',\n};\n`, 'single quotes, right hash').status, 0);
  git('reset', '-q', '--hard', base);
  // A pins file the reader can't make sense of stops the scan, rather than skipping the checks.
  const none = commitPins('export const pinnedFiles = {\n  og: [1, 2, 3],\n};\n', 'unreadable pins');
  assert.notEqual(none.status, 0);
  assert.match(none.stderr, /no pinned hashes/);
  git('reset', '-q', '--hard', base);
});

test('the push scan asks for a pull when the remote has unknown commits', () => {
  const head = git('rev-parse', 'HEAD');
  const result = scan(['--push'], `refs/heads/main ${head} refs/heads/main ${'1'.repeat(40)}\n`);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /git pull/);
});

test('reader returns null for a missing path but rethrows any other git failure', () => {
  const run = (snapshot) => spawnSync(process.execPath, ['--input-type=module', '-e',
    `import { reader } from ${JSON.stringify(pathToFileURL(resolve(import.meta.dirname, 'phone-sources.mjs')).href)};
     try { console.log(JSON.stringify(reader(${JSON.stringify(snapshot)})('no/such/file.txt'))); } catch (e) { console.log('THROWN'); }`],
  { cwd: repo, encoding: 'utf8' }).stdout.trim();
  assert.equal(run('HEAD'), 'null');
  assert.equal(run(':'), 'null');
  assert.equal(run('not-a-real-commit'), 'THROWN');
});

test('UTF-16 text is decoded, and only listed binary types are skipped', () => {
  const text = `call ${number}`;
  assert.equal(decodeText(Buffer.from(text, 'utf16le')), text);
  assert.equal(decodeText(Buffer.from(text, 'utf16le').swap16()), text);
  assert.equal(phonesIn(Buffer.from(`${text}\0`), 'notes.txt').length, 1);
  assert.equal(phonesIn(Buffer.from(text), 'image.png').length, 0);
});
