// Pre-deploy checks that a build alone cannot catch. Each module in scripts/checks/ covers one
// area and reports what failed, so every failure shows at once instead of only the first.
// Run: npm run check (CI runs it before the build; WORKFLOWS.txt lists every check).
import * as content from './checks/content.mjs';
import * as links from './checks/links.mjs';
import * as metrics from './checks/metrics.mjs';
import * as phones from './checks/phones.mjs';
import * as resume from './checks/resume.mjs';

const areas = [content, links, metrics, resume, phones];
const failures = areas.flatMap((area) => area.failures);

if (phones.hooksOff) console.warn('! The git hooks that stop a phone number before it is pushed are off here. Run npm install.');
if (links.unlinked.length) console.warn(`Not linked from the site: ${links.unlinked.join(', ')}`);
if (failures.length) {
  console.error(failures.map((f) => `✗ ${f}`).join('\n'));
  process.exit(1);
}
for (const line of areas.flatMap((area) => area.summary)) console.log(`✓ ${line}`);
