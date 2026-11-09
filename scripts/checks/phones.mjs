// Every tracked file is scanned for a phone number, not chosen folders: a number in a code comment
// is just as public. The git hooks run the same scan on each commit, merge and push, before
// anything is public (scripts/check-phone.mjs); this scan in CI is the last line.
import { git, trackedFiles, withPhones } from '../phone-sources.mjs';

const tracked = trackedFiles();
export const failures = withPhones(tracked).map((name) => `${name} contains a phone number`);
export const summary = [`no phone numbers in ${tracked.length} tracked files`];

// Outside CI, the hooks should be on; a copy where npm install never ran has them off.
let hooksPath = '';
try { hooksPath = git(['config', 'core.hooksPath']).toString().trim(); } catch { /* not set */ }
export const hooksOff = !process.env.CI && hooksPath !== '.githooks';
