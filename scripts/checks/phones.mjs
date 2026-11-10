// Every tracked file is scanned for a phone number, not chosen folders: a number in a code comment
// is just as public. The real gate is the git hooks (scripts/check-phone.mjs), which run the same
// scan on each commit, merge and push. By the time this runs in CI the commit is already on GitHub,
// so a failure here means removing the number and rewriting history. A copy where npm install never
// ran, or an edit on GitHub's website, has no hooks; check warns about the first.
import { git, trackedFiles, untiedBinaries, withPhones } from '../phone-sources.mjs';

const tracked = trackedFiles();
export const failures = [...withPhones(tracked).map((name) => `${name} contains a phone number`), ...untiedBinaries(tracked)];
export const summary = [`no phone numbers in ${tracked.length} tracked files`];

// Outside CI, the hooks should be on; a copy where npm install never ran has them off.
let hooksPath = '';
try { hooksPath = git(['config', 'core.hooksPath']).toString().trim(); } catch { /* not set */ }
export const hooksOff = !process.env.CI && hooksPath !== '.githooks';
