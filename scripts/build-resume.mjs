// Prints resume/resume.html to public/Wachirawit_Kaewdang_Resume.pdf with headless Chrome, so the
// résumé is rebuilt from a committed source instead of edited by hand. Run: npm run resume
// Uses the Chrome or Edge already installed; set CHROME=/path/to/chrome to choose another.
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const source = resolve(root, 'resume/resume.html');
const out = resolve(root, 'public/Wachirawit_Kaewdang_Resume.pdf');

const candidates = [
  process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);
const chrome = candidates.find((path) => existsSync(path));
if (!chrome) {
  console.error('No Chrome or Edge found. Set CHROME to its path and run again.');
  process.exit(1);
}

execFileSync(chrome, [
  '--headless=new',
  '--disable-gpu',
  '--no-pdf-header-footer',
  // Fonts load from node_modules next to the source, so file:// access must be allowed.
  '--allow-file-access-from-files',
  `--print-to-pdf=${out}`,
  pathToFileURL(source).href,
], { stdio: 'inherit' });

console.log(`Wrote ${out}`);
