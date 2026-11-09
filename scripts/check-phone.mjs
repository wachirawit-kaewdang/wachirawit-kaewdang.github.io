// Scans for phone numbers before anything is public. The git hooks in .githooks run it on every
// commit: the staged files (--staged) and the commit message (--message <file>). With no
// arguments it scans every tracked file, as npm run check also does in CI.
// Run: npm run check:phone. The hooks are switched on by npm install (the prepare script).
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { phonesIn } from './checks/phone.mjs';

const git = (args) => execFileSync('git', args, { maxBuffer: 256 * 1024 * 1024 });
const [mode, file] = process.argv.slice(2);
let sources;
if (mode === '--message') {
  sources = [['the commit message', readFileSync(file)]];
} else if (mode === '--staged') {
  // What will be committed is the staged copy, which can differ from the file on disk.
  const names = git(['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z']).toString().split('\0').filter(Boolean);
  sources = names.map((name) => [name, git(['show', `:${name}`])]);
} else {
  const names = git(['ls-files', '-z']).toString().split('\0').filter(Boolean);
  sources = names.map((name) => [name, readFileSync(name)]);
}

const found = sources.filter(([, bytes]) => phonesIn(bytes).length).map(([name]) => name);
if (found.length) {
  console.error(`✗ phone number found in ${found.join(', ')}. Remove it before committing; ` +
    'use only the made-up numbers in scripts/checks/phone.mjs as examples.');
  process.exit(1);
}
if (!mode) console.log(`✓ no phone numbers in ${sources.length} tracked files`);
