// The page renders only in the browser, so a build can pass while the published site is blank,
// shows NaN, or puts correct numbers in the wrong place. This opens the built site in headless
// Chrome and compares what each page rendered with what metrics.js computed.
// Run: npm run build, then npm run render-check (CI runs it before deploying).
import { dumpDom, withSite } from './chrome.mjs';
import { findPhones } from './checks/phone.mjs';
import {
  alwaysUpF1, bondRankRows, collapsed, ensembleAuc, rankGapRange, retrainAuc, retrainCorrWins, modelRows, table1Rows,
} from '../src/metrics.js';
import { projects } from '../src/data.js';

// The abstract's opening sentence, read from data.js so a rewording can't break this check.
const opening = projects.find((p) => p.finding).finding[0].split('. ')[0];

const port = 4179;
const pct = (v) => v.toFixed(3);
const pages = [
  {
    path: '/',
    expected: ['Wachirawit Kaewdang', `Abstract. ${opening}.`, 'Looking for', `${rankGapRange} positions apart`, 'did not favour SHAP', 'Contact'],
    tables: { 'table-1': table1Rows },
    headers: { 'table-1': ['Model', 'F1'] },
  },
  {
    path: '/#/cs403',
    // Numbers and conclusions in the appendix's prose, which nothing else reads.
    expected: ['Appendix A', 'Figure A.3', 'A.6', `disagreed by ${rankGapRange} rank positions`, `roughly ${rankGapRange} positions`, 'about 5 to 13', 'first 30 test days',
      '20-day window', `averaged ROC-AUC ${retrainAuc.corr} and SHAP’s ${retrainAuc.shap}`,
      `higher on ${retrainCorrWins} of the`, `averaged ${ensembleAuc}`, 'did not favour SHAP'],
    tables: {
      'table-a1': bondRankRows,
      'table-a2': collapsed.map((s) => [s.ticker, pct(s.lstm.acc), pct(s.lstm.f1), pct(alwaysUpF1(s.lstm.acc))]),
      'table-a3': modelRows,
    },
    headers: {
      'table-a1': ['Stock', 'SHAP rank', 'Correlation rank'],
      'table-a2': ['Stock', 'Accuracy', 'Our F1', 'Always-up F1'],
      'table-a3': ['Model', 'F1', 'ROC-AUC'],
    },
    // Figure A.1's tick marks 9 on a 0–12 scale, on every one of its 27 rows.
    ticks: { 'figure-a1': { left: '75%', count: 27 } },
  },
];

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

async function read({ chrome, profile, url }, { path, expected, tables = {}, headers = {}, ticks = {} }) {
  const dom = await dumpDom(chrome, profile, `${url}${path}`);

  const text = plain(dom.replace(/<(script|style)\b[\s\S]*?<\/\1>/g, ' '));
  for (const phrase of expected) {
    if (!text.includes(phrase)) failures.push(`${path} did not render “${phrase}”`);
  }
  if (findPhones(text).length) failures.push(`${path} shows a phone number`);
  for (const [word] of text.matchAll(/\bNaN\b|\bundefined\b|\bnull(?:th)?\b/g)) failures.push(`${path} shows the literal text “${word}”`);
  for (const [id, rows] of Object.entries(tables)) {
    const shown = rowsOf(dom, id);
    if (JSON.stringify(shown) !== JSON.stringify(rows)) failures.push(`${path} #${id} shows ${JSON.stringify(shown)}, expected ${JSON.stringify(rows)}`);
  }
  for (const [id, names] of Object.entries(headers)) {
    const start = dom.indexOf(`id="${id}"`);
    const head = dom.slice(dom.indexOf('<thead', start), dom.indexOf('</thead>', start));
    const shown = [...head.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map(([, cell]) => plain(cell));
    if (JSON.stringify(shown) !== JSON.stringify(names)) failures.push(`${path} #${id} has headers ${JSON.stringify(shown)}`);
  }
  for (const [id, { left, count }] of Object.entries(ticks)) {
    const start = dom.indexOf(`id="${id}"`);
    const figure = dom.slice(start, dom.indexOf('</figure>', start));
    const found = figure.split(`left: ${left}`).length - 1;
    if (found !== count) failures.push(`${path} #${id} has ${found} ticks at ${left}, expected ${count}`);
  }
}

await withSite('render-check', port, async (site) => {
  for (const page of pages) {
    await read(site, page).catch((error) => failures.push(`${page.path} could not be opened in Chrome: ${error.message.split('\n')[0]}`));
  }
});

if (failures.length) {
  console.error(failures.map((f) => `✗ ${f}`).join('\n'));
  process.exit(1);
}
console.log(`✓ ${pages.length} pages rendered their tables, ticks and key sentences as computed`);
