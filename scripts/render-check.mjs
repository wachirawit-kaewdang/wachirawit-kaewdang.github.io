// The page renders only in the browser, so a build can pass while the published site is blank,
// shows NaN, or puts correct numbers in the wrong place. This opens the built site in headless
// Chrome and compares what each page rendered with what metrics.js computed.
// Run: npm run build, then npm run render-check (CI runs it before deploying).
import { execFile } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { preview } from 'vite';
import { findChrome } from './chrome.mjs';
import {
  alwaysUpF1, bondRankRows, collapsed, ensembleAuc, rankGapRange, retrainAuc, retrainCorrWins, table1Rows,
} from '../src/metrics.js';

const run = promisify(execFile);
const port = 4179;
const pct = (v) => v.toFixed(3);
const pages = [
  {
    path: '/',
    expected: ['Wachirawit Kaewdang', 'Abstract. I checked our senior-project model', `${rankGapRange} positions apart`, 'did not favour SHAP', 'Contact'],
    tables: { 'table-1': table1Rows },
  },
  {
    path: '/#/cs403',
    // Numbers and conclusions in the appendix's prose, which nothing else reads.
    expected: ['Appendix A', 'Figure A.3', 'A.6', `${rankGapRange} rank positions`, 'about 5 to 13', 'first 30 test days',
      '20-day window', `averaged ROC-AUC ${retrainAuc.corr} and SHAP’s ${retrainAuc.shap}`,
      `higher on ${retrainCorrWins} of the`, `averaged ${ensembleAuc}`, 'did not favour SHAP'],
    tables: {
      'table-a1': bondRankRows,
      'table-a2': collapsed.map((s) => [s.ticker, pct(s.lstm.acc), pct(s.lstm.f1), pct(alwaysUpF1(s.lstm.acc))]),
    },
    // Figure A.1's tick marks 9 on a 0–12 scale, on every one of its 27 rows.
    ticks: { 'figure-a1': { left: '75%', count: 27 } },
  },
];

const chrome = findChrome();
// A run that was killed outright can't clean up after itself, so a later one does. Only old
// folders, so this can't remove the profile of a run still going.
for (const old of readdirSync(tmpdir()).filter((name) => name.startsWith('render-check-'))) {
  const path = join(tmpdir(), old);
  if (Date.now() - statSync(path).mtimeMs > 3_600_000) rmSync(path, { recursive: true, force: true, maxRetries: 3 });
}
const profile = mkdtempSync(join(tmpdir(), 'render-check-'));
const server = await preview({ logLevel: 'silent', preview: { port, strictPort: true } });
const failures = [];

const plain = (html) => html.replace(/<[^>]+>/g, ' ').replaceAll('&amp;', '&').replace(/\s+/g, ' ').trim();

// The rows of the table inside the element with this id, as lists of cell text.
function rowsOf(dom, id) {
  const start = dom.indexOf(`id="${id}"`);
  if (start < 0) return null;
  const body = dom.slice(dom.indexOf('<tbody', start), dom.indexOf('</tbody>', start));
  return [...body.matchAll(/<tr[\s\S]*?<\/tr>/g)].map(([row]) =>
    [...row.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map(([, cell]) => plain(cell)));
}

async function read({ path, expected, tables = {}, ticks = {} }) {
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

  const text = plain(dom.replace(/<(script|style)\b[\s\S]*?<\/\1>/g, ' '));
  for (const phrase of expected) {
    if (!text.includes(phrase)) failures.push(`${path} did not render “${phrase}”`);
  }
  for (const [word] of text.matchAll(/\bNaN\b|\bundefined\b|\bnull(?:th)?\b/g)) failures.push(`${path} shows the literal text “${word}”`);
  for (const [id, rows] of Object.entries(tables)) {
    const shown = rowsOf(dom, id);
    if (JSON.stringify(shown) !== JSON.stringify(rows)) failures.push(`${path} #${id} shows ${JSON.stringify(shown)}, expected ${JSON.stringify(rows)}`);
  }
  for (const [id, { left, count }] of Object.entries(ticks)) {
    const start = dom.indexOf(`id="${id}"`);
    const figure = dom.slice(start, dom.indexOf('</figure>', start));
    const found = figure.split(`left: ${left}`).length - 1;
    if (found !== count) failures.push(`${path} #${id} has ${found} ticks at ${left}, expected ${count}`);
  }
}

try {
  for (const page of pages) {
    await read(page).catch((error) => failures.push(`${page.path} could not be opened in Chrome: ${error.message.split('\n')[0]}`));
  }
} finally {
  await new Promise((done) => server.httpServer.close(done));
  rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}

if (failures.length) {
  console.error(failures.map((f) => `✗ ${f}`).join('\n'));
  process.exit(1);
}
console.log(`✓ ${pages.length} pages rendered their tables, ticks and key sentences as computed`);
