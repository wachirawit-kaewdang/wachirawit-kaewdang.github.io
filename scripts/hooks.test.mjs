// Tests for the git hooks' phone scan (scripts/check-phone.mjs), run against a throwaway repo.
// The number is assembled at run time from made-up digits, so no phone-shaped text is in this file.
// Run: npm test
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
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

test('the push scan asks for a pull when the remote has unknown commits', () => {
  const head = git('rev-parse', 'HEAD');
  const result = scan(['--push'], `refs/heads/main ${head} refs/heads/main ${'1'.repeat(40)}\n`);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /git pull/);
});

test('UTF-16 text is decoded, and only listed binary types are skipped', () => {
  const text = `call ${number}`;
  assert.equal(decodeText(Buffer.from(text, 'utf16le')), text);
  assert.equal(decodeText(Buffer.from(text, 'utf16le').swap16()), text);
  assert.equal(phonesIn(Buffer.from(`${text}\0`), 'notes.txt').length, 1);
  assert.equal(phonesIn(Buffer.from(text), 'image.png').length, 0);
});
