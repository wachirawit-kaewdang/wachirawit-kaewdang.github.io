// Pre-deploy checks that a build alone cannot catch: every file the site links to must exist in
// public/, so a typo in a file name fails CI instead of becoming a 404 on the live site.
// Run: npm run check (CI runs it before the build).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { profile } from '../src/data.js';
import { alwaysUpF1, collapsed } from '../src/metrics.js';

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

// Appendix A claims the 0.30-threshold stocks collapsed to always-up, so their F1 must equal
// 2p / (1 + p) for accuracy p. If a rerun of the notebook breaks that, the claim must change too.
for (const s of collapsed) {
  if (Math.abs(s.lstm.f1 - alwaysUpF1(s.lstm.acc)) > 0.0006) {
    failures.push(`metrics.json: ${s.ticker} F1 ${s.lstm.f1} is not the always-up value for accuracy ${s.lstm.acc}`);
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
console.log(`✓ always-up identity holds for ${collapsed.length} stocks`);
