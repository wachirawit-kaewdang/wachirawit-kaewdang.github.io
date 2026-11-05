// Finds the Chrome or Edge already installed, for the scripts that need a real browser.
// Set CHROME=/path/to/chrome to choose another.
import { existsSync } from 'node:fs';

export function findChrome() {
  const chrome = [
    process.env.CHROME,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ].filter(Boolean).find((path) => existsSync(path));
  if (!chrome) {
    console.error('No Chrome or Edge found. Set CHROME to its path and run again.');
    process.exit(1);
  }
  return chrome;
}
