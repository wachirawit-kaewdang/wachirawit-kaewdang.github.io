// Runs a Python script with python3, or python where that is the only name (Windows). The
// interpreter is picked once, so a failing run is never retried under a different Python.
// Run: node scripts/python.mjs <script> [args]
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const found = ['python3', 'python'].find((name) => spawnSync(name, ['--version']).status === 0);
export const noPython = '✗ Python 3.10+ not found (tried python3 and python). Install it and run again.';
// With no Python at all, scripts that need one say so instead of failing silently.
export const python = found ?? 'python3';
export const hasPython = Boolean(found);

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!found) {
    console.error(noPython);
    process.exit(1);
  }
  const { status } = spawnSync(python, process.argv.slice(2), { stdio: 'inherit' });
  process.exit(status ?? 1);
}
