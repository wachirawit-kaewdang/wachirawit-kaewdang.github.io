// Every file the site links to exists in public/, so a typo fails CI instead of becoming a 404,
// and the files copied in by hand are the ones that were checked.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { profile, projects } from '../../src/data.js';
import { pinnedFiles } from './pins.mjs';
import { pub, read, sha256 } from './shared.mjs';

export const failures = [];
const referenced = new Set();

function expect(path, from) {
  referenced.add(path);
  if (!existsSync(pub(path))) failures.push(`${from} links to public/${path}, which does not exist`);
}

// Résumé, linked through asset(profile.resume) on both pages.
expect(profile.resume, 'src/data.js (profile.resume)');
// A project's screenshot, shown on the home page through asset(project.shot.src).
for (const p of projects) if (p.shot) expect(p.shot.src, `src/data.js (${p.title} shot)`);
// GitHub Pages serves this for an address that doesn't exist, and its links must lead somewhere.
expect('404.html', 'GitHub Pages');
// Search engines and audit tools ask for this; without it they get the page HTML instead.
expect('robots.txt', 'crawlers');
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

// Charts and the share image are copied in by hand, so a swapped or re-encoded file shows up here.
for (const [file, hash] of Object.entries(pinnedFiles)) {
  if (!existsSync(pub(file)) || sha256(readFileSync(pub(file))) !== hash) {
    failures.push(`public/${file} changed; if that was meant, update its hash in scripts/checks/pins.mjs`);
  }
}

// Files in public/ that nothing links to are not errors, but worth knowing about.
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(resolve(dir, e.name)) : [relative(pub(''), resolve(dir, e.name)).replaceAll('\\', '/')]);
const unused = walk(pub('')).filter((f) => !referenced.has(f));

export const unlinked = unused;
export const summary = [`${referenced.size} linked files exist in public/`];
