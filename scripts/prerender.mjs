// Writes the home page's rendered HTML into dist/index.html after the build, so a reader or tool
// that doesn't run JavaScript (a text scraper, an applicant tracking system) still gets every word.
// React replaces this copy when the page loads. Run: npm run build (it runs this afterwards).
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { dumpDom, withSite } from './chrome.mjs';
import { projects } from '../src/data.js';

const port = 4180;
const page = resolve(import.meta.dirname, '..', 'dist', 'index.html');
const empty = '<div id="root"></div>';
// index.html marks where the root ends, so the cut never depends on what follows it.
const endMark = '</div><!--root-end-->';

const html = readFileSync(page, 'utf8');
if (!html.includes(empty) || !html.includes(endMark)) {
  console.error('✗ dist/index.html has no empty, marked root to fill; run vite build first');
  process.exit(1);
}

const dom = await withSite('prerender', port, ({ chrome, profile, url }) => dumpDom(chrome, profile, `${url}/`));

// The root's contents run from its opening tag to the marked closing one.
const open = dom.indexOf('<div id="root">');
const end = dom.indexOf(endMark, open);
if (open < 0 || end < 0) {
  console.error('✗ the rendered page has no marked root; is <!--root-end--> still right after it in index.html?');
  process.exit(1);
}
const start = open + '<div id="root">'.length;
const rendered = dom.slice(start, end);

// Every project title must be in the raw HTML, or the point of this step is lost.
const missing = projects.map((p) => p.title).filter((title) => !rendered.includes(title));
if (!rendered.includes('I check whether results hold up') || missing.length) {
  console.error(`✗ the pre-rendered home page is incomplete${missing.length ? `: missing ${missing.join(', ')}` : ''}`);
  process.exit(1);
}

// A function, not a string: in a replacement string, page text like $& or $$ would be read as a pattern.
writeFileSync(page, html.replace(empty, () => `<div id="root">${rendered}</div>`));
console.log(`✓ pre-rendered the home page into dist/index.html (${Math.round(rendered.length / 1024)} KB of HTML)`);
