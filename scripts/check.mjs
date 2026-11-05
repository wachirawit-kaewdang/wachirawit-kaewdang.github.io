// Pre-deploy checks that a build alone cannot catch: every file the site links to must exist in
// public/, so a typo in a file name fails CI instead of becoming a 404 on the live site.
// Run: npm run check (CI runs it before the build).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, relative } from 'node:path';
import { profile, projects } from '../src/data.js';
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

// The notebook has no random seeds and downloads live prices, so a rerun would change every
// number. The results stay at this commit.
const frozenAt = '0c4ef04';

// metrics.json is rebuilt by scripts/extract-metrics.py; a parsing slip should fail here, not
// render as NaN. Rates sit in [0, 1], thresholds in (0, 1), ranks among the 27 features.
const rate = (v) => typeof v === 'number' && v >= 0 && v <= 1;
const rank = (v) => Number.isInteger(v) && v >= 1 && v <= 27;
const shape = [];
if (metrics.source?.commit !== frozenAt) {
  shape.push(`source commit is ${metrics.source?.commit}, but the results are frozen at ${frozenAt}. Moving it means ` +
    'redoing the charts, sectorShap and typed claims first (see WORKFLOWS.txt), then changing frozenAt in check.mjs');
}
const stockEntries = Object.entries(metrics.stocks ?? {});
// Typed prose, the charts and "2 per sector" all assume this many stocks and sectors.
if (stockEntries.length !== 10) shape.push(`${stockEntries.length} stocks, expected 10`);
for (const [ticker, s] of stockEntries) {
  const bad = [
    typeof s.sector !== 'string' && 'sector',
    !(rate(s.threshold) && s.threshold > 0 && s.threshold < 1) && 'threshold',
    !rank(s.bondYieldRank) && 'bondYieldRank',
    !(s.bondCorrelationRank === null || rank(s.bondCorrelationRank)) && 'bondCorrelationRank',
    ...['acc', 'f1'].filter((k) => !rate(s.lstm?.[k])).map((k) => `lstm.${k}`),
    ...['ensemble', 'rf', 'lr'].flatMap((m) => ['acc', 'f1', 'auc'].filter((k) => !rate(s[m]?.[k])).map((k) => `${m}.${k}`)),
  ].filter(Boolean);
  if (bad.length) shape.push(`${ticker}: ${bad.join(', ')}`);
}
const sectors = metrics.sectorShap ?? [];
if (sectors.length !== 5) shape.push(`${sectors.length} sectors in sectorShap, expected 5`);
for (const { sector, rows } of sectors) {
  if (rows?.length !== 10 || !rows.every(([f, v]) => typeof f === 'string' && rate(v) && v > 0)) {
    shape.push(`sectorShap ${sector}: expected 10 [feature, value] rows`);
  }
  if (!stockEntries.some(([, s]) => s.sector === sector)) shape.push(`sectorShap ${sector}: no stock has this sector`);
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
  `top-5 for ${bondTop5Share} stocks (#1 for ${bondFirstFor})`,
  `on ${collapsed.length} of ${stockCount} stocks the tuned model collapsed`,
  `ROC-AUC averaged ${ensembleAuc}`,
];
for (const claim of resumeClaims) {
  if (!resume.includes(claim)) failures.push(`resume/resume.html should say “${claim}” (computed from metrics.json)`);
}

// The PDF is built from resume.html by hand (npm run resume), which records both files' hashes.
// If either has changed since, the live PDF is not the one this source builds.
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const recorded = existsSync(resolve(root, 'resume/resume.sha256')) ? read('resume/resume.sha256').split(/\s+/) : [];
if (recorded[0] !== sha256(resume.replaceAll('\r\n', '\n'))
  || recorded[1] !== sha256(readFileSync(pub(profile.resume)))) {
  failures.push('the résumé PDF was not built from resume/resume.html as committed; run npm run resume and commit both');
}

// The PDF is what recruiters download, so it must stay on one page and in the résumé's own font.
// Chrome falls back to another font without a word when a character is missing from STIX.
const pdf = readFileSync(pub(profile.resume)).toString('latin1');
const pages = pdf.match(/\/Type\s*\/Page\b(?!s)/g)?.length ?? 0;
if (pages !== 1) failures.push(`the résumé PDF has ${pages} pages, expected 1`);
const fonts = [...new Set([...pdf.matchAll(/\/BaseFont\s*\/([^\s/>]+)/g)].map((m) => m[1]))];
const stray = fonts.filter((font) => !font.includes('STIXTwoText'));
if (!fonts.length || stray.length) {
  failures.push(`the résumé PDF uses fonts other than STIX Two Text: ${stray.join(', ') || 'none found'}`);
}

// The contact details are typed into the résumé and share image too, so a change in data.js has
// to reach them. The share image is a PNG built by hand, so this checks only its source.
const bare = (url) => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
const contacts = [
  profile.email,
  ...[profile.site, profile.linkedin, profile.github, projects.find((p) => p.caseStudy).link].map(bare),
];
for (const contact of contacts) {
  if (!resume.includes(contact)) failures.push(`resume/resume.html should include ${contact} (from src/data.js)`);
}
if (!read('og/og-image.html').includes(bare(profile.site))) {
  failures.push(`og/og-image.html should include ${bare(profile.site)} (from src/data.js)`);
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
console.log(`✓ résumé matches ${resumeClaims.length} computed CS403 numbers and ${contacts.length} contact details`);
console.log(`✓ résumé PDF is one page in ${fonts.length} STIX fonts, and its recorded hashes match`);
