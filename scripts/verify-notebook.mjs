// CI's notebook comparison, for running locally: rebuilds metrics.json from the notebook and fails
// if anything changed. Needs a Project-CS403 checkout, at ../Project-CS403 or in CS403_REPO; without
// one it says so and passes, because CI still runs the comparison. Python 3.10+.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const repo = resolve(process.env.CS403_REPO ?? resolve(root, '..', 'Project-CS403'));
if (!existsSync(resolve(repo, '.git'))) {
  console.log(`- skipped the notebook comparison: no checkout at ${repo}`);
  process.exit(0);
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
const same = (buffer) => buffer.toString('utf8').replaceAll('\r\n', '\n');
if (same(before) !== same(after)) {
  console.error('✗ src/metrics.json differs from what the notebook gives');
  process.exit(1);
}
console.log('✓ metrics.json matches the notebook');
