// Prints resume/resume.html to public/Wachirawit_Kaewdang_Resume.pdf with headless Chrome, so the
// résumé is rebuilt from a committed source instead of edited by hand. Run: npm run resume
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { findChrome } from './chrome.mjs';

const root = resolve(import.meta.dirname, '..');
const source = resolve(root, 'resume/resume.html');
const out = resolve(root, 'public/Wachirawit_Kaewdang_Resume.pdf');

// Chrome silently falls back to another serif when a font file is missing, so the PDF would
// look wrong without any error. Check every @font-face file before printing.
const html = readFileSync(source, 'utf8');
const missingFonts = [...html.matchAll(/url\('([^']+\.woff2)'\)/g)]
  .map(([, url]) => resolve(dirname(source), url))
  .filter((path) => !existsSync(path));
if (missingFonts.length) {
  console.error(`Missing font files (run npm ci first):\n  ${missingFonts.join('\n  ')}`);
  process.exit(1);
}

const chrome = findChrome();
const before = existsSync(out) ? statSync(out).mtimeMs : 0;
execFileSync(chrome, [
  '--headless=new',
  '--disable-gpu',
  '--no-pdf-header-footer',
  // Fonts load from node_modules next to the source, so file:// access must be allowed.
  '--allow-file-access-from-files',
  `--print-to-pdf=${out}`,
  pathToFileURL(source).href,
  // A Chrome that hangs (a profile lock, a first-run dialog) should fail the script, not stall it.
], { stdio: 'inherit', timeout: 60_000 });

// Chrome can exit 0 without writing anything, so confirm a fresh PDF actually came out.
const written = existsSync(out) && statSync(out);
if (!written || written.mtimeMs <= before || !readFileSync(out).subarray(0, 5).equals(Buffer.from('%PDF-'))) {
  console.error(`Chrome did not write a new PDF to ${out}`);
  process.exit(1);
}
// The check compares these with the committed files, so a forgotten rebuild fails CI.
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
writeFileSync(resolve(root, 'resume/resume.sha256'),
  `${sha256(html.replaceAll('\r\n', '\n'))}\n${sha256(readFileSync(out))}\n`);
console.log(`Wrote ${out} (${Math.round(written.size / 1024)} KB)`);
