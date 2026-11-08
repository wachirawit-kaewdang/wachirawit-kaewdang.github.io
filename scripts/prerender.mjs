// Writes the home page's rendered HTML into dist/index.html after the build, so a reader or tool
// that doesn't run JavaScript (a text scraper, an applicant tracking system) still gets every word.
// React replaces this copy when the page loads. Run: npm run build (it runs this afterwards).
import { execFile } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { preview } from 'vite';
import { findChrome } from './chrome.mjs';
import { projects } from '../src/data.js';

const run = promisify(execFile);
const port = 4180;
const page = resolve(import.meta.dirname, '..', 'dist', 'index.html');
const empty = '<div id="root"></div>';

const html = readFileSync(page, 'utf8');
if (!html.includes(empty)) {
  console.error('✗ dist/index.html has no empty root to fill; run vite build first');
  process.exit(1);
}

const profile = mkdtempSync(join(tmpdir(), 'prerender-'));
const server = await preview({ logLevel: 'silent', preview: { port, strictPort: true } });
let dom;
try {
  ({ stdout: dom } = await run(findChrome(), [
    '--headless=new', '--disable-gpu', '--no-sandbox', `--user-data-dir=${profile}`,
    '--virtual-time-budget=5000', '--dump-dom', `http://localhost:${port}/`,
  ], { timeout: 60_000, maxBuffer: 16 * 1024 * 1024 }));
} finally {
  await new Promise((done) => server.httpServer.close(done));
  rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}

// The root's contents end at the last </div> before the <noscript> that follows the root.
const start = dom.indexOf('<div id="root">') + '<div id="root">'.length;
const end = dom.lastIndexOf('</div>', dom.indexOf('<noscript', start));
const rendered = dom.slice(start, end);

// Every project title must be in the raw HTML, or the point of this step is lost.
const missing = projects.map((p) => p.title).filter((title) => !rendered.includes(title));
if (start < '<div id="root">'.length || !rendered.includes('I check whether results hold up') || missing.length) {
  console.error(`✗ the pre-rendered home page is incomplete${missing.length ? `: missing ${missing.join(', ')}` : ''}`);
  process.exit(1);
}

writeFileSync(page, html.replace(empty, `<div id="root">${rendered}</div>`));
console.log(`✓ pre-rendered the home page into dist/index.html (${Math.round(rendered.length / 1024)} KB of HTML)`);
