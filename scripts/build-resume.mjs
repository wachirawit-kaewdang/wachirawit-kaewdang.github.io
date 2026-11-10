// Prints resume/resume.html to public/Wachirawit_Kaewdang_Resume.pdf with headless Chrome, so the
// résumé is rebuilt from a committed source instead of edited by hand. Run: npm run resume
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromeFlags, findChrome } from './chrome.mjs';
import { phonesIn } from './checks/phone.mjs';
import { sha256 } from './checks/shared.mjs';
import { profile } from '../src/data.js';

const root = resolve(import.meta.dirname, '..');
const source = resolve(root, 'resume/resume.html');
const out = resolve(root, 'public', profile.resume);

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
// A throwaway profile, so an open Chrome window can't lock the run.
const chromeProfile = mkdtempSync(join(tmpdir(), 'build-resume-'));
// The phone scan reads resume.html as typed, but the PDF holds what Chrome renders, where tags
// and spacing can join a split number back together. So the rendered page is scanned first.
let leak = false;
try {
const shown = execFileSync(chrome, [
  ...chromeFlags(chromeProfile), '--allow-file-access-from-files', '--dump-dom', pathToFileURL(source).href,
], { timeout: 60_000, maxBuffer: 16 * 1024 * 1024 });
leak = phonesIn(shown, 'resume.html').length > 0;
if (!leak) execFileSync(chrome, [
  ...chromeFlags(chromeProfile),
  '--no-pdf-header-footer',
  // Fonts load from node_modules next to the source, so file:// access must be allowed.
  '--allow-file-access-from-files',
  `--print-to-pdf=${out}`,
  pathToFileURL(source).href,
  // A Chrome that hangs (a profile lock, a first-run dialog) should fail the script, not stall it.
], { stdio: 'inherit', timeout: 60_000 });
} finally {
  try { rmSync(chromeProfile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* left for the OS */ }
}
if (leak) {
  console.error('✗ the rendered résumé shows a phone number. Remove it from resume/resume.html; no PDF was written.');
  process.exit(1);
}

// Chrome can exit 0 without writing anything, so confirm a fresh PDF actually came out.
const written = existsSync(out) && statSync(out);
if (!written || written.mtimeMs <= before || !readFileSync(out).subarray(0, 5).equals(Buffer.from('%PDF-'))) {
  console.error(`Chrome did not write a new PDF to ${out}`);
  process.exit(1);
}
// The check compares these with the committed files, so a forgotten rebuild fails CI.
writeFileSync(resolve(root, 'resume/resume.sha256'),
  `${sha256(html.replaceAll('\r\n', '\n'))}\n${sha256(readFileSync(out))}\n`);
console.log(`Wrote ${out} (${Math.round(written.size / 1024)} KB)`);
