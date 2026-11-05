// The page renders only in the browser, so a build can pass while the published site is blank or
// shows NaN. This opens the built site in headless Chrome and reads what each page rendered.
// Run: npm run build, then npm run render-check (CI runs it before deploying).
import { execFile } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { preview } from 'vite';
import { findChrome } from './chrome.mjs';

const run = promisify(execFile);
const port = 4179;
const pages = [
  { path: '/', expected: ['Wachirawit Kaewdang', 'Table 1', 'Always predict', 'Contact'] },
  { path: '/#/cs403', expected: ['Appendix A', 'Table A.1', 'Figure A.3', 'A.6'] },
];

const chrome = findChrome();
const profile = mkdtempSync(join(tmpdir(), 'render-check-'));
const server = await preview({ logLevel: 'silent', preview: { port, strictPort: true } });
const failures = [];

for (const { path, expected } of pages) {
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
  for (const [word] of text.matchAll(/\b(?:NaN|undefined)\b/g)) failures.push(`${path} shows the literal text “${word}”`);
}

await new Promise((done) => server.httpServer.close(done));
rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });

if (failures.length) {
  console.error(failures.map((f) => `✗ ${f}`).join('\n'));
  process.exit(1);
}
console.log(`✓ ${pages.length} pages rendered with the expected content`);
