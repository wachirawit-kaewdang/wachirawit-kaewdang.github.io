// Shared by the scripts that open the built site in a real browser: finding Chrome, serving
// dist/, and a throwaway Chrome profile. Set CHROME=/path/to/chrome to choose another browser.
import { execFile } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);

export function findChrome() {
  const chrome = [
    process.env.CHROME,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ].filter(Boolean).find((path) => existsSync(path));
  if (!chrome) {
    console.error('No Chrome or Edge found. Set CHROME to its path and run again.');
    process.exit(1);
  }
  return chrome;
}

// The flags every script starts Chrome with. GitHub's Linux runners (and Linux in general, often
// run as root or in a container) don't allow Chrome's sandbox, so it is turned off only there.
// That is safe here because Chrome only ever loads the site just built. On Windows and macOS
// the sandbox stays on.
const noSandbox = Boolean(process.env.CI) || process.platform === 'linux';
export const chromeFlags = (profile) => [
  '--headless=new', '--disable-gpu', ...(noSandbox ? ['--no-sandbox'] : []), `--user-data-dir=${profile}`,
];

// The page's HTML after its scripts ran, from a one-shot headless Chrome.
export async function dumpDom(chrome, profile, url) {
  // Not execFileSync: that would block the preview server this same process is running.
  const { stdout } = await run(chrome, [...chromeFlags(profile), '--virtual-time-budget=5000', '--dump-dom', url], {
    timeout: 60_000,
    maxBuffer: 16 * 1024 * 1024,
  });
  return stdout;
}

// Serves dist/ on `port` with a fresh Chrome profile, runs `task`, then stops the server and
// removes the profile. Profiles left by a run that was killed outright are removed first, once
// they are an hour old so a run still going keeps its own. A cleanup error, such as a folder
// Windows still has locked, never hides the result of `task`.
export async function withSite(prefix, port, task) {
  for (const old of readdirSync(tmpdir()).filter((name) => name.startsWith(`${prefix}-`))) {
    const path = join(tmpdir(), old);
    try {
      if (Date.now() - statSync(path).mtimeMs > 3_600_000) rmSync(path, { recursive: true, force: true });
    } catch { /* still in use; a later run tries again */ }
  }
  const profile = mkdtempSync(join(tmpdir(), `${prefix}-`));
  const { preview } = await import('vite');
  const server = await preview({ logLevel: 'silent', preview: { port, strictPort: true } });
  try {
    return await task({ chrome: findChrome(), profile, url: `http://localhost:${port}` });
  } finally {
    await new Promise((done) => server.httpServer.close(done));
    try {
      rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    } catch { /* left for the OS, or the next run's cleanup */ }
  }
}
