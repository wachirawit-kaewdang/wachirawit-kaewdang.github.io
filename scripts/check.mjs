// Pre-deploy checks that a build alone cannot catch: linked files exist, metrics.json and the
// numbers computed from it match the frozen results, and the résumé and share image agree with
// the site. Run: npm run check (CI runs it before the build; WORKFLOWS.txt lists every check).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, relative } from 'node:path';
import { education, profile, projects, skills } from '../src/data.js';
import metrics from '../src/metrics.json' with { type: 'json' };
import {
  alwaysUpF1, aucRange, bondAgreeFor, bondCorrelationOnly, bondCorrelationRankOf, bondRankRows, bondShapOnly, lstmF1About, rankGapRange,
  vixRevealed, bondFirstFor, bondRankOf, bondTop5Share, collapsed, ensembleAuc,
  notCollapsed, retrainAuc, retrainCorrWins, sectorCount, stockCount, table1Rows,
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
// GitHub Pages serves this for an address that doesn't exist, and its links must lead somewhere.
expect('404.html', 'GitHub Pages');
for (const [, path] of read('public/404.html').matchAll(/href="\/([^"#]+)"/g)) expect(path, 'public/404.html');

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
    ...['acc', 'f1'].filter((k) => !rate(s.vix?.[k])).map((k) => `vix.${k}`),
    ...['ensemble', 'rf', 'lr'].flatMap((m) => ['acc', 'f1', 'auc'].filter((k) => !rate(s[m]?.[k])).map((k) => `${m}.${k}`)),
    ...['corr', 'shap'].flatMap((m) => ['acc', 'f1', 'auc'].filter((k) => !rate(s.retrain?.[m]?.[k])).map((k) => `retrain.${m}.${k}`)),
  ].filter(Boolean);
  if (bad.length) shape.push(`${ticker}: ${bad.join(', ')}`);
}
const sectors = metrics.sectorShap ?? [];
if (sectors.length !== 5) shape.push(`${sectors.length} sectors in sectorShap, expected 5`);
for (const { sector, stocks, rows } of sectors) {
  if (rows?.length !== 10 || !rows.every(([f, v]) => typeof f === 'string' && rate(v) && v > 0)) {
    shape.push(`sectorShap ${sector}: expected 10 [feature, value] rows`);
  }
  // Figure A.2 prints these tickers beside each sector's bars.
  const tickers = stockEntries.filter(([, s]) => s.sector === sector).map(([ticker]) => ticker);
  if (!tickers.length) shape.push(`sectorShap ${sector}: no stock has this sector`);
  if (stocks?.split(', ').sort().join() !== tickers.sort().join()) {
    shape.push(`sectorShap ${sector}: lists ${stocks}, but its stocks are ${tickers.join(', ')}`);
  }
}
for (const s of shape) failures.push(`metrics.json: ${s}`);

// The extractor proves the per-stock numbers. These cover what it can't: sectorShap and the source
// block, which it copies rather than rebuilds, and the calculations in metrics.js. The results are
// frozen, so any change here is a mistake unless the freeze itself is being moved.
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const pinned = '0c34c8839b6f093b0550ec0f2bc8e2078b47fba96500a1fc6b0ab723ddf1cdb3';
const copied = sha256(JSON.stringify({ source: metrics.source, sectorShap: metrics.sectorShap, rankGap: metrics.rankGap }));
if (copied !== pinned) failures.push(`metrics.json: sectorShap, rankGap or source changed; their hash is now ${copied}`);
if (metrics.rankGap?.length !== 27) failures.push('metrics.json: rankGap should have all 27 features');
const computed = {
  table1Rows,
  aucRange,
  ensembleAuc,
  retrainAuc,
  retrainCorrWins,
  collapsed: collapsed.map((s) => s.ticker),
  vixRevealed: vixRevealed.map((s) => s.ticker),
  lstmF1About,
  bondAgreeFor,
  bondShapOnly,
  bondCorrelationOnly,
  bondRankRows,
  rankGapRange,
};
const expectedOutputs = {
  "table1Rows": [
    [
      "Always predict “up” (baseline)",
      "0.707‡",
      "0.500"
    ],
    [
      "LSTM, same 7 stocks",
      "0.707‡",
      "n/r†"
    ],
    [
      "LSTM + self-attention",
      "0.710",
      "n/r†"
    ],
    [
      "Ensemble (LSTM + RF + LR, soft vote)",
      "0.663",
      "0.568"
    ],
    [
      "Logistic Regression",
      "0.525",
      "0.555"
    ],
    [
      "Random Forest",
      "0.374",
      "0.546"
    ]
  ],
  "aucRange": "0.55–0.57",
  "ensembleAuc": "0.568",
  "retrainAuc": {
    "corr": "0.543",
    "shap": "0.499"
  },
  "retrainCorrWins": 6,
  "collapsed": [
    "JPM",
    "UNH",
    "GS",
    "XOM",
    "CVX",
    "TSLA",
    "AMZN"
  ],
  "vixRevealed": [
    "JNJ",
    "COST"
  ],
  "lstmF1About": "0.71",
  "bondAgreeFor": "JPM",
  "bondShapOnly": "TSLA (2nd by SHAP, 15th by correlation) and COST (2nd by SHAP, 18th by correlation)",
  "bondCorrelationOnly": "XOM (2nd by correlation, 22nd by SHAP)",
  "bondRankRows": [
    [
      "JPM",
      "1st",
      "2nd"
    ],
    [
      "AMZN",
      "1st",
      "not printed"
    ],
    [
      "TSLA",
      "2nd",
      "15th"
    ],
    [
      "COST",
      "2nd",
      "18th"
    ],
    [
      "NVDA",
      "3rd",
      "not printed"
    ],
    [
      "JNJ",
      "5th",
      "not printed"
    ],
    [
      "UNH",
      "12th",
      "not printed"
    ],
    [
      "GS",
      "16th",
      "not printed"
    ],
    [
      "CVX",
      "19th",
      "not printed"
    ],
    [
      "XOM",
      "22nd",
      "2nd"
    ]
  ],
  "rankGapRange": "5 to 12"
};
if (JSON.stringify(computed) !== JSON.stringify(expectedOutputs)) {
  failures.push(`src/metrics.js: computed results changed: ${JSON.stringify(computed)}`);
}

// Appendix A claims the 0.30-threshold stocks collapsed to always-up, so their F1 must equal
// 2p / (1 + p) for accuracy p. If a rerun of the notebook breaks that, the claim must change too.
for (const s of collapsed) {
  // The identity alone proves no down day was called correctly. A second model landing on the same
  // accuracy is the supporting evidence that these stocks really did collapse to "up".
  if (s.lstm.acc !== s.vix.acc) failures.push(`metrics.json: ${s.ticker}'s LSTM and VIX accuracy differ`);
  if (Math.abs(s.lstm.f1 - alwaysUpF1(s.lstm.acc)) > 0.0006) {
    failures.push(`metrics.json: ${s.ticker} F1 ${s.lstm.f1} is not the always-up value for accuracy ${s.lstm.acc}`);
  }
}
// And the other way: Table A.2's note says the remaining stocks did not collapse, so their F1
// must not match it.
for (const s of notCollapsed) {
  if (Math.abs(s.lstm.f1 - alwaysUpF1(s.lstm.acc)) <= 0.0006) {
    failures.push(`metrics.json: ${s.ticker} F1 equals always-up, but Appendix A says it did not collapse`);
  }
}

// The résumé is hand-set HTML, so its CS403 numbers are checked against the computed ones. Each
// phrase is how resume.html says it; if a rerun changes a number, update the résumé and rebuild it.
const resume = read('resume/resume.html');
const resumeText = resume.replace(/<!--[\s\S]*?-->/g, ''); // a number in a comment isn't on the résumé
const resumeClaims = [
  `${stockCount} US stocks across ${sectorCount} sectors`,
  `top-5 for ${bondTop5Share} stocks (#1 for ${bondFirstFor})`,
  `on ${collapsed.length} of ${stockCount} stocks the tuned model collapsed`,
  `ROC-AUC averaged ${ensembleAuc}`,
  `TSLA: ${bondRankOf('TSLA')} by SHAP, ${bondCorrelationRankOf('TSLA')} by correlation`,
  // Typed facts, frozen with the results and read back from the notebook by hand.
  '27 engineered features',
  `${rankGapRange.replace(' to ', '–')} positions`,
  'Two-person project',
  profile.location,
  '60-day window',
  '3 layers, hidden size 128',
  education.school,
  education.degree.split(' — ')[0],
  education.period,
];
for (const claim of resumeClaims) {
  if (!resumeText.includes(claim)) failures.push(`resume/resume.html should say “${claim}”`);
}
// Every skill on the site is on the résumé, allowing for the two it words differently.
const resumeWording = { 'REST APIs': 'REST API design', 'Testing (TDD)': 'testing (TDD)' };
for (const skill of skills.flatMap((group) => group.items)) {
  if (!resumeText.includes(resumeWording[skill] ?? skill)) failures.push(`resume/resume.html should list the skill ${skill}`);
}

// The PDF is built from resume.html by hand (npm run resume), which records both files' hashes.
// If either has changed since, the live PDF is not the one this source builds.
const pdf = existsSync(pub(profile.resume)) ? readFileSync(pub(profile.resume)).toString('latin1') : '';
const recorded = existsSync(resolve(root, 'resume/resume.sha256')) ? read('resume/resume.sha256').split(/\s+/) : [];
if (recorded[0] !== sha256(resume.replaceAll('\r\n', '\n'))
  || !pdf || recorded[1] !== sha256(Buffer.from(pdf, 'latin1'))) {
  failures.push('the résumé PDF was not built from resume/resume.html as committed; run npm run resume and commit both');
}

// The PDF is what recruiters download, so it must stay on one page and in the résumé's own font.
// Chrome falls back to another font without a word when a character is missing from STIX.
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
  if (!resumeText.includes(contact)) failures.push(`resume/resume.html should include ${contact} (from src/data.js)`);
}
const shareSource = read('og/og-image.html');
for (const detail of [bare(profile.site), profile.name]) {
  if (!shareSource.includes(detail)) failures.push(`og/og-image.html should include ${detail} (from src/data.js)`);
}
if (!html.includes(profile.email)) failures.push(`index.html's noscript text should include ${profile.email}`);

// Charts and the share image are copied in by hand, so a swapped or re-encoded file shows up here.
const pinnedFiles = {
  "cs403/rank_disagreement_summary.webp": "2b215d8a06e9c1579707f17e7de5ee9d60447213934a47c5474b13f3c505040d",
  "cs403/sector_shap.webp": "503a30afb4b6f4ef2d944ecc809e18e94f037af1be2b34fc51ec4680aacd78dd",
  "cs403/final_summary.webp": "ce5bbc984ad03bc040fcf34f5138945b0d506689885bc179e6f2124846304340",
  "og-image.png": "e70a5bc1f41227e6064e21b6a73106c7a8ef52c6585d90e4ac3a0aa52e63c491"
};
for (const [file, hash] of Object.entries(pinnedFiles)) {
  if (!existsSync(pub(file)) || sha256(readFileSync(pub(file))) !== hash) {
    failures.push(`public/${file} changed; if that was meant, update its hash in scripts/check.mjs`);
  }
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
console.log(`✓ résumé matches ${resumeClaims.length} CS403 and education facts, all skills and ${contacts.length} contact details`);
console.log(`✓ résumé PDF is one page in ${fonts.length} STIX fonts, and its recorded hashes match`);
