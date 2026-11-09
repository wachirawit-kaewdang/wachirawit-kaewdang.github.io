// Scans for phone numbers before anything is public. The git hooks in .githooks run it:
//   --staged             the files a commit or merge would record (pre-commit, pre-merge-commit)
//   --message <file>     the commit message (commit-msg)
//   --push               every commit about to be pushed, files and messages (pre-push, which
//                        also covers commits made with --no-verify or by a cherry-pick)
// With no arguments it scans every tracked file, as npm run check also does in CI.
// Run: npm run check:phone. npm install switches the hooks on (the prepare script).
import { readFileSync } from 'node:fs';
import { commitContents, git, stagedFiles, trackedFiles, withPhones } from './phone-sources.mjs';

const [mode, file] = process.argv.slice(2);
const none = /^0+$/;
let sources;
if (mode === '--message') {
  sources = [['the commit message', readFileSync(file)]];
} else if (mode === '--staged') {
  sources = stagedFiles();
} else if (mode === '--push') {
  // git gives one line per ref being pushed: local ref, local commit, remote ref, remote commit.
  const commits = new Set();
  for (const line of readFileSync(0, 'utf8').split('\n').filter(Boolean)) {
    const [, local, , remote] = line.split(' ');
    if (none.test(local)) continue; // deleting a branch sends nothing
    const range = none.test(remote) ? [local, '--not', '--remotes'] : [`${remote}..${local}`];
    for (const commit of git(['rev-list', ...range]).toString().split('\n').filter(Boolean)) commits.add(commit);
  }
  sources = [...commits].flatMap(commitContents);
} else {
  sources = trackedFiles();
}

const found = withPhones(sources);
if (found.length) {
  console.error(`✗ phone number found in ${found.join(', ')}. Remove it first; ` +
    'use only the made-up numbers in scripts/checks/phone.mjs as examples.');
  process.exit(1);
}
if (!mode) console.log(`✓ no phone numbers in ${sources.length} tracked files`);
