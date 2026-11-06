// CI's notebook comparison, for running locally: rebuilds metrics.json from the notebook and fails
// if anything changed, naming the first value that differs. Needs a Project-CS403 checkout, at
// ../Project-CS403 or in CS403_REPO. With no checkout at the default place it says so and passes,
// because CI still runs the comparison; a CS403_REPO that doesn't exist is a mistake, so it fails.
// Python 3.10+.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const repo = resolve(process.env.CS403_REPO ?? resolve(root, '..', 'Project-CS403'));
if (!existsSync(resolve(repo, '.git'))) {
  if (process.env.CS403_REPO) {
    console.error(`✗ CS403_REPO is set, but ${repo} is not a git checkout`);
    process.exit(1);
  }
  console.log(`- skipped the notebook comparison: no checkout at ${repo}`);
  process.exit(0);
}

// The path of the first value that differs, such as stocks.JPM.lstm.f1.
function firstDifference(a, b, path = '') {
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return a === b ? null : `${path}: ${JSON.stringify(a)} in the file, ${JSON.stringify(b)} from the notebook`;
  }
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const found = firstDifference(a[key], b[key], path ? `${path}.${key}` : key);
    if (found) return found;
  }
  return null;
}

const file = resolve(root, 'src/metrics.json');
const before = readFileSync(file);
const python = spawnSync('python3', ['--version']).status === 0 ? 'python3' : 'python';
let after;
try {
  execFileSync(python, [resolve(root, 'scripts/extract-metrics.py'), repo], { stdio: ['ignore', 'ignore', 'inherit'] });
  after = readFileSync(file);
} finally {
  // Only a comparison: the file goes back exactly as it was, line endings included.
  writeFileSync(file, before);
}
const difference = firstDifference(JSON.parse(before.toString('utf8')), JSON.parse(after.toString('utf8')));
if (difference) {
  console.error(`✗ src/metrics.json differs from the notebook at ${difference}`);
  process.exit(1);
}
console.log('✓ metrics.json matches the notebook');
