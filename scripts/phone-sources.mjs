// What the phone-number scans read, as [name, bytes] pairs. No side effects, so the git hooks
// (scripts/check-phone.mjs) and npm run check (scripts/checks/phones.mjs) can both import it.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { phonesIn } from './checks/phone.mjs';

const root = resolve(import.meta.dirname, '..');
export const git = (args) => execFileSync('git', args, { cwd: root, maxBuffer: 256 * 1024 * 1024, stdio: ['pipe', 'pipe', 'ignore'] });
const names = (output) => output.toString().split('\0').filter(Boolean);

// The names, from [name, bytes] pairs, whose bytes hold a phone number.
export const withPhones = (sources) => sources.filter(([, bytes]) => phonesIn(bytes).length).map(([name]) => name);

// Tracked files as they are on disk; one deleted but not yet committed has nothing to scan.
export const trackedFiles = () => names(git(['ls-files', '-z']))
  .filter((name) => existsSync(resolve(root, name)))
  .map((name) => [name, readFileSync(resolve(root, name))]);
// What a commit would record: the staged copy, which can differ from the file on disk.
export const stagedFiles = () =>
  names(git(['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z'])).map((name) => [name, git(['show', `:${name}`])]);
// Every file a commit added or changed, and its message.
export const commitContents = (commit) => [
  ...names(git(['diff-tree', '--no-commit-id', '-r', '--root', '--name-only', '--diff-filter=ACMR', '-z', commit]))
    .map((name) => [`${name} in ${commit.slice(0, 7)}`, git(['show', `${commit}:${name}`])]),
  [`the message of ${commit.slice(0, 7)}`, git(['log', '-1', '--format=%B', commit])],
];
