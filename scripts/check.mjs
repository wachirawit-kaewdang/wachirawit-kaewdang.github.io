// Pre-deploy checks that a build alone cannot catch: every file the site links to must exist in
// public/, so a typo in a file name fails CI instead of becoming a 404 on the live site.
// Run: npm run check (CI runs it before the build).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { profile } from '../src/data.js';
import metrics from '../src/metrics.json' with { type: 'json' };
import {
  alwaysUpF1, bondFirstFor, bondTop5Share, collapsed, ensembleAuc, notCollapsed, sectorCount, stockCount,
} from '../src/metrics.js';

const root = resolve(import.meta.dirname, '..');
const pub = (path) => resolve(root, 'public', path);
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const failures = [];
const referenced = new Set();

function expect(path, from) {
  referenced.add(path);
  if (!existsSync(pub(path))) failures.push(`${from} links to public/${path}, which does not exist`);
}

// Résumé, linked through asset(profile.resume) on both pages.
expect(profile.resume, 'src/data.js (profile.resume)');

// Appendix figures: <Figure name="..."> props and img('...') calls map to public/cs403/<name>.webp.
const appendix = read('src/ProjectCS403.jsx');
for (const m of appendix.matchAll(/\bname="([\w-]+)"|\bimg\('([\w-]+)'\)/g)) {
  expect(`cs403/${m[1] ?? m[2]}.webp`, 'src/ProjectCS403.jsx');
}

// index.html: root-relative files (favicon) and the absolute og:image, which must also be ours.
const html = read('index.html');
for (const [, path] of html.matchAll(/(?:href|src)="\/([^"/][^"]*)"/g)) {
  if (!path.startsWith('src/')) expect(path, 'index.html');
}
for (const [, path] of html.matchAll(/property="og:image" content="(?:%SITE_URL%|https?:\/\/[^/]+\/)([^"]+)"/g)) {
  expect(path, 'index.html (og:image)');
}

// metrics.json is rebuilt by scripts/extract-metrics.py; a parsing slip should fail here, not
// render as NaN. Rates sit in [0, 1], thresholds in (0, 1), ranks among the 27 features.
const rate = (v) => typeof v === 'number' && v >= 0 && v <= 1;
const shape = [];
const stockEntries = Object.entries(metrics.stocks ?? {});
if (stockEntries.length !== 10) shape.push(`${stockEntries.length} stocks, expected 10`);
for (const [ticker, s] of stockEntries) {
  const bad = [
    typeof s.sector !== 'string' && 'sector',
    !(s.threshold > 0 && s.threshold < 1) && 'threshold',
    !(Number.isInteger(s.bondYieldRank) && s.bondYieldRank >= 1 && s.bondYieldRank <= 27) && 'bondYieldRank',
    ...['acc', 'f1'].filter((k) => !rate(s.lstm?.[k])).map((k) => `lstm.${k}`),
    ...['ensemble', 'rf', 'lr'].flatMap((m) => ['acc', 'f1', 'auc'].filter((k) => !rate(s[m]?.[k])).map((k) => `${m}.${k}`)),
  ].filter(Boolean);
  if (bad.length) shape.push(`${ticker}: ${bad.join(', ')}`);
}
const sectors = metrics.sectorShap ?? [];
if (sectors.length !== 5) shape.push(`${sectors.length} sectors in sectorShap, expected 5`);
for (const { sector, rows } of sectors) {
  if (rows?.length !== 10 || !rows.every(([f, v]) => typeof f === 'string' && v > 0 && v < 1)) {
    shape.push(`sectorShap ${sector}: expected 10 [feature, value] rows`);
  }
}
for (const s of shape) failures.push(`metrics.json: ${s}`);

// Appendix A claims the 0.30-threshold stocks collapsed to always-up, so their F1 must equal
// 2p / (1 + p) for accuracy p. If a rerun of the notebook breaks that, the claim must change too.
for (const s of collapsed) {
  if (Math.abs(s.lstm.f1 - alwaysUpF1(s.lstm.acc)) > 0.0006) {
    failures.push(`metrics.json: ${s.ticker} F1 ${s.lstm.f1} is not the always-up value for accuracy ${s.lstm.acc}`);
  }
}
// And the other way: Table A.1's note says the remaining stocks did not collapse, so their F1
// must not match it.
for (const s of notCollapsed) {
  if (Math.abs(s.lstm.f1 - alwaysUpF1(s.lstm.acc)) <= 0.0006) {
    failures.push(`metrics.json: ${s.ticker} F1 equals always-up, but Appendix A says it did not collapse`);
  }
}

// The résumé is hand-set HTML, so its CS403 numbers are checked against the computed ones. Each
// phrase is how resume.html says it; if a rerun changes a number, update the résumé and rebuild it.
const resume = read('resume/resume.html');
const resumeClaims = [
  `${stockCount} US stocks across ${sectorCount} sectors`,
  `top-5 driver for ${bondTop5Share} stocks (#1 for ${bondFirstFor})`,
  `on ${collapsed.length} of ${stockCount} stocks the tuned model collapsed`,
  `ROC-AUC averaged ${ensembleAuc}`,
];
for (const claim of resumeClaims) {
  if (!resume.includes(claim)) failures.push(`resume/resume.html should say “${claim}” (computed from metrics.json)`);
}

// Files in public/ that nothing links to are not errors, but worth knowing about.
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(resolve(dir, e.name)) : [relative(pub(''), resolve(dir, e.name)).replaceAll('\\', '/')]);
const unused = walk(pub('')).filter((f) => !referenced.has(f));

if (unused.length) console.warn(`Not linked from the site: ${unused.join(', ')}`);
if (failures.length) {
  console.error(failures.map((f) => `✗ ${f}`).join('\n'));
  process.exit(1);
}
console.log(`✓ ${referenced.size} linked files exist in public/`);
console.log(`✓ metrics.json has the expected shape (${stockEntries.length} stocks, ${sectors.length} sectors)`);
console.log(`✓ always-up identity holds for ${collapsed.length} stocks and fails for ${notCollapsed.length}`);
console.log(`✓ résumé matches ${resumeClaims.length} computed CS403 numbers`);
