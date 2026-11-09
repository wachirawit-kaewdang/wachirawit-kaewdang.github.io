// CI's notebook comparison, for running locally: rebuilds metrics.json from the frozen notebook
// kept in data/ and fails if anything changed, naming the first value that differs. If a
// Project-CS403 checkout is present (../Project-CS403, or CS403_REPO), it also confirms that copy
// is byte for byte the notebook at the frozen commit. Python 3.10+.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { python } from './python.mjs';

const root = resolve(import.meta.dirname, '..');
const file = resolve(root, 'src/metrics.json');
const before = readFileSync(file);
const { source } = JSON.parse(before.toString('utf8'));
const copy = resolve(root, `data/notebook-${source.commit}.ipynb`);

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

let after;
try {
  execFileSync(python, [resolve(root, 'scripts/extract-metrics.py'), copy], { stdio: ['ignore', 'ignore', 'inherit'] });
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
console.log('✓ metrics.json matches the frozen notebook');

const repo = resolve(process.env.CS403_REPO ?? resolve(root, '..', 'Project-CS403'));
if (!existsSync(resolve(repo, '.git'))) {
  if (process.env.CS403_REPO) {
    console.error(`✗ CS403_REPO is set, but ${repo} is not a git checkout`);
    process.exit(1);
  }
  console.log(`- skipped comparing the copy with Project-CS403: no checkout at ${repo}`);
  process.exit(0);
}
const original = execFileSync('git', ['-C', repo, 'show', `${source.commit}:${source.notebook}`], { maxBuffer: 64 * 1024 * 1024 });
if (!original.equals(readFileSync(copy))) {
  console.error(`✗ data/notebook-${source.commit}.ipynb is not the notebook at ${source.commit} in Project-CS403`);
  process.exit(1);
}
console.log(`✓ the copy in data/ is byte for byte the notebook at ${source.commit}`);
