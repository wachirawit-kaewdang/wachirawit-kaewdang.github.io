// Scans for phone numbers before anything is public. The git hooks in .githooks run it:
//   --staged             the files a commit or merge would record (pre-commit, pre-merge-commit)
//   --message <file>     the commit message (commit-msg)
//   --push [remote]      every commit and tag about to be pushed (pre-push, which also covers
//                        commits made with --no-verify or by a cherry-pick). A new branch is
//                        compared only with what that remote already has, not with any remote.
//   --history            every commit reachable from HEAD, files and messages, for phone numbers only
//                        (CI runs it). It skips the hash checks below: old commits predate the pins.
// Every mode but --message and --history also fails a file it can't read (an image, PDF, .docx)
// unless that file is listed in scripts/checks/pins.mjs or is the résumé PDF, and --staged and
// --push check that each listed file still matches its hash.
// With no arguments it scans every tracked file, as npm run check also does in CI.
// Run: npm run check:phone. npm install switches the hooks on (the prepare script).
import { readFileSync } from 'node:fs';
import { brokenTies, commitContents, git, reader, stagedFiles, trackedFiles, untiedBinaries, withPhones } from './phone-sources.mjs';

const [mode, file] = process.argv.slice(2);
const none = /^0+$/;
const fail = (lines) => {
  console.error(lines.map((line) => `✗ ${line}`).join('\n'));
  process.exit(1);
};

let sources;
let ties = [];
if (mode === '--message') {
  sources = [['the commit message', readFileSync(file)]];
} else if (mode === '--staged') {
  sources = stagedFiles();
  ties = brokenTies(reader(':'));
} else if (mode === '--push') {
  // git gives one line per ref being pushed: local ref, local object, remote ref, remote object.
  const commits = new Set();
  sources = [];
  for (const line of readFileSync(0, 'utf8').split('\n').filter(Boolean)) {
    const [, local, , remote] = line.split(' ');
    if (none.test(local)) continue; // deleting a branch or tag sends nothing
    // A commit made on GitHub's website isn't here until it is fetched, and git can't compare.
    if (!none.test(remote)) {
      try { git(['cat-file', '-e', `${remote}^{commit}`]); } catch {
        fail(['GitHub has commits this copy doesn\'t. Run git pull first, then push again.']);
      }
    }
    // An annotated tag carries its own message.
    if (git(['cat-file', '-t', local]).toString().trim() === 'tag') {
      sources.push([`the tag ${line.split(' ')[0]}`, git(['cat-file', '-p', local])]);
    }
    const known = file ? `--remotes=${file}` : '--remotes';
    const range = none.test(remote) ? [local, '--not', known] : [`${remote}..${local}`];
    for (const commit of git(['rev-list', ...range]).toString().split('\n').filter(Boolean)) commits.add(commit);
  }
  for (const commit of commits) {
    sources.push(...commitContents(commit));
    ties.push(...brokenTies(reader(commit), ` in ${commit.slice(0, 7)}`));
  }
} else if (mode === '--history') {
  // Every commit reachable from HEAD: its changed files and its message. Phone numbers only. An
  // old commit predates the pins and ties of today, so the hash checks would fail there by design.
  sources = [];
  for (const commit of git(['rev-list', 'HEAD']).toString().split('\n').filter(Boolean)) {
    sources.push(...commitContents(commit));
  }
} else {
  sources = trackedFiles();
}

const found = withPhones(sources);
const problems = [
  ...(found.length ? [`phone number found in ${found.join(', ')}. Remove it first; use only the made-up numbers in scripts/checks/phone.mjs as examples.`] : []),
  ...(mode === '--message' || mode === '--history' ? [] : untiedBinaries(sources)),
  ...ties,
];
if (problems.length) fail(problems);
if (!mode) console.log(`✓ no phone numbers in ${sources.length} tracked files`);
if (mode === '--history') console.log(`✓ no phone numbers in ${sources.length} files and messages across the history`);
