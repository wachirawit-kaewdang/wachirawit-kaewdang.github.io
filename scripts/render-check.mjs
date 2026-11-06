// The page renders only in the browser, so a build can pass while the published site is blank or
// shows NaN. This opens the built site in headless Chrome and reads what each page rendered.
// Run: npm run build, then npm run render-check (CI runs it before deploying).
import { execFile } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { preview } from 'vite';
import { findChrome } from './chrome.mjs';

const run = promisify(execFile);
const port = 4179;
const pages = [
  { path: '/', expected: ['Wachirawit Kaewdang', 'Table 1', 'Main result', 'Always predict', '0.707', '0.568', 'Contact'] },
  {
    path: '/#/cs403',
    // Numbers and facts typed into the appendix's prose, which nothing else reads.
    expected: ['Appendix A', 'Table A.1', 'Table A.2', 'Figure A.3', '0.543', '5 to 12', 'about 5 to 13',
      'first 30 test days', '20-day window', 'A.6'],
  },
];

const chrome = findChrome();
// A run that was killed outright can't clean up after itself, so the next one does.
for (const old of readdirSync(tmpdir()).filter((name) => name.startsWith('render-check-'))) {
  rmSync(join(tmpdir(), old), { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
}
const profile = mkdtempSync(join(tmpdir(), 'render-check-'));
const server = await preview({ logLevel: 'silent', preview: { port, strictPort: true } });
const failures = [];

async function read(path, expected) {
  // Not the Sync call: that would block the server this same process is running.
  const { stdout: dom } = await run(chrome, [
    '--headless=new',
    '--disable-gpu',
    // GitHub's Linux runners don't allow Chrome's sandbox. This only loads the site just built.
    '--no-sandbox',
    `--user-data-dir=${profile}`,
    '--virtual-time-budget=5000',
    '--dump-dom',
    `http://localhost:${port}${path}`,
  ], { timeout: 60_000, maxBuffer: 16 * 1024 * 1024 });

  const text = dom.replace(/<(script|style)\b[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]+>/g, ' ');
  for (const phrase of expected) {
    if (!text.includes(phrase)) failures.push(`${path} did not render “${phrase}”`);
  }
  for (const [word] of text.matchAll(/\bNaN\b|\bundefined\b|\bnull(?:th)?\b/g)) failures.push(`${path} shows the literal text “${word}”`);
}

try {
  for (const { path, expected } of pages) {
    await read(path, expected).catch((error) => failures.push(`${path} could not be opened in Chrome: ${error.message.split('\n')[0]}`));
  }
} finally {
  await new Promise((done) => server.httpServer.close(done));
  rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}

if (failures.length) {
  console.error(failures.map((f) => `✗ ${f}`).join('\n'));
  process.exit(1);
}
console.log(`✓ ${pages.length} pages rendered with the expected content`);
