// What the phone-number scans read, as [name, bytes] pairs, and the hash ties that cover the
// binary files they can't read. No side effects, so the git hooks (scripts/check-phone.mjs) and
// npm run check (scripts/checks/phones.mjs) can both import it. Git runs hooks from the top of the
// repository, so paths are relative to the current folder.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { phonesIn, unreadable } from './checks/phone.mjs';
import { pinnedFiles, shareSourceHash } from './checks/pins.mjs';
import { profile } from '../src/data.js';

// A failed git command throws with git's own message, not only "Command failed".
export function git(args) {
  try {
    return execFileSync('git', args, { maxBuffer: 256 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (error) {
    throw new Error(`git ${args[0]} failed: ${error.stderr?.toString().trim() || error.message}`, { cause: error });
  }
}
const names = (output) => output.toString().split('\0').filter(Boolean);
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const lf = (bytes) => bytes.toString('utf8').replaceAll('\r\n', '\n');

// A source's file path: its name without the commit it came from (" in abc1234"). A path may
// itself hold spaces (my cv.html), so only that exact suffix is removed.
const pathOf = (name) => name.replace(/ in [0-9a-f]{7}$/, '');

// The names, from [name, bytes] pairs, whose bytes hold a phone number. Names may carry a suffix
// (" in abc1234"), so the file type is read from the path before it.
export const withPhones = (sources) =>
  sources.filter(([name, bytes]) => phonesIn(bytes, pathOf(name)).length).map(([name]) => name);

// The files the scan can't read (images, PDFs, fonts, .docx, anything not text) that aren't tied by
// hash to a scanned source. A new one has to be tied in scripts/checks/pins.mjs on purpose, so a
// screenshot or a Word copy of the private résumé can't slip through unread.
const tied = new Set([`public/${profile.resume}`, ...Object.keys(pinnedFiles).map((file) => `public/${file}`)]);
export const untiedBinaries = (sources) => sources
  .filter(([name, bytes]) => !tied.has(pathOf(name)) && unreadable(bytes, pathOf(name)))
  .map(([name]) => `${name} can't be scanned for a phone number. Tie it by hash in scripts/checks/pins.mjs, or keep it out of the repo`);

// Tracked files as they are on disk; one deleted but not yet committed has nothing to scan.
export const trackedFiles = () => names(git(['ls-files', '-z']))
  .filter((name) => existsSync(resolve(name)))
  .map((name) => [name, readFileSync(resolve(name))]);
// What a commit would record: the staged copy, which can differ from the file on disk.
export const stagedFiles = () =>
  names(git(['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z'])).map((name) => [name, git(['show', `:${name}`])]);
// Every file a commit added or changed, and its message. For a merge, -m compares it with each
// parent, so a file changed while resolving a conflict is read too.
export const commitContents = (commit) => [
  ...[...new Set(names(git(['diff-tree', '-m', '--no-commit-id', '-r', '--root', '--name-only', '--diff-filter=ACMR', '-z', commit])))]
    .map((name) => [`${name} in ${commit.slice(0, 7)}`, git(['show', `${commit}:${name}`])]),
  [`the message of ${commit.slice(0, 7)}`, git(['log', '-1', '--format=%B', commit])],
];

// A file's bytes in a snapshot (":" for the staged index, or a commit), or null if it isn't there.
export const reader = (snapshot) => (path) => {
  // Ask git whether the path is listed, instead of reading its English error text. A snapshot git
  // can't read (a bad commit, a broken repository) makes the listing itself fail, and that throws.
  const listed = snapshot === ':'
    ? git(['ls-files', '-z', '--', `:(literal)${path}`])
    : git(['ls-tree', '-z', '--name-only', snapshot, '--', path]);
  if (!names(listed).includes(path)) return null;
  return git(['show', `${snapshot}${snapshot === ':' ? '' : ':'}${path}`]);
};

// The binary files can't be scanned, so each must match the hash that ties it to a scanned source:
// the résumé PDF to resume/resume.html through resume/resume.sha256, the share image to
// og/og-image.html, and the charts to their pinned hashes. Returns what doesn't match.
// The pinned hashes in a snapshot's scripts/checks/pins.mjs, read as text (it can't be imported
// from a commit). On disk, or in a snapshot without the file, the current pins apply.
function pinsIn(read) {
  const text = read('scripts/checks/pins.mjs')?.toString();
  if (!text) return { files: pinnedFiles, share: shareSourceHash };
  // Single or double quotes, as a formatter may write either.
  const files = Object.fromEntries([...text.matchAll(/(["'])([^"'\n]+)\1\s*:\s*(["'])([0-9a-f]{64})\3/g)].map(([, , file, , hash]) => [file, hash]));
  // A pins file with no entries read means the reader no longer matches its format. Skipping the
  // checks quietly would let a changed image through, so stop instead.
  if (!Object.keys(files).length) throw new Error('scripts/checks/pins.mjs has no pinned hashes the reader can find; update pinsIn in scripts/phone-sources.mjs');
  return { files, share: text.match(/shareSourceHash\s*=\s*["']([0-9a-f]{64})["']/)?.[1] };
}

export function brokenTies(read, where = '') {
  const problems = [];
  const pdf = read(`public/${profile.resume}`);
  const html = read('resume/resume.html');
  const recorded = read('resume/resume.sha256')?.toString().split(/\s+/) ?? [];
  if (pdf && (!html || recorded[0] !== sha256(lf(html)) || recorded[1] !== sha256(pdf))) {
    problems.push(`the résumé PDF${where} was not built from resume/resume.html as it stands; run npm run resume`);
  }
  // The hashes as that snapshot recorded them: an older commit in a push still has the older
  // image and the older hash together, so it is compared with its own pins, not today's.
  const pins = pinsIn(read);
  for (const [file, hash] of Object.entries(pins.files)) {
    const bytes = read(`public/${file}`);
    if (bytes && sha256(bytes) !== hash) problems.push(`public/${file}${where} doesn't match its pinned hash`);
  }
  const share = read('og/og-image.html');
  if (share && pins.share && sha256(lf(share)) !== pins.share) {
    problems.push(`og/og-image.html${where} doesn't match the hash the share image was built from`);
  }
  return problems;
}
