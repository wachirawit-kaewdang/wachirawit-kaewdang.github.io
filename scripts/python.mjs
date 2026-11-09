// Runs a Python script with python3, or python where that is the only name (Windows). The
// interpreter is picked once, so a failing run is never retried under a different Python.
// Run: node scripts/python.mjs <script> [args]
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const python = spawnSync('python3', ['--version']).status === 0 ? 'python3' : 'python';

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { status } = spawnSync(python, process.argv.slice(2), { stdio: 'inherit' });
  process.exit(status ?? 1);
}
