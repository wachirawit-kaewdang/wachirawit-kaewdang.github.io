// The résumé and share image are typed by hand, so they are compared with the site: its CS403
// numbers, facts, skills and contact details, and the PDF's page count, fonts and source.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { education, profile, projects, skills } from '../../src/data.js';
import {
  bondCorrelationRankOf, bondFirstFor, bondOppositeFor, bondRankOf, bondSplitFor, bondTop5Share, collapsed, ensembleAuc,
  lstmF1About, rankGapRange, sectorCount, stockCount,
} from '../../src/metrics.js';
import { phonesIn } from './phone.mjs';
import { pub, read, root, sha256 } from './shared.mjs';

export const failures = [];

// The résumé is hand-set HTML, so its CS403 numbers are checked against the computed ones. Each
// phrase is how resume.html says it; if a rerun changes a number, update the résumé and rebuild it.
const resume = read('resume/resume.html');
// A number in a comment isn't on the résumé, and the HTML's line breaks can fall inside a phrase.
const resumeText = resume.replace(/<!--[\s\S]*?-->/g, '').replace(/\s+/g, ' ');
const resumeClaims = [
  `${stockCount} US stocks across ${sectorCount} sectors`,
  `top-5 for ${bondTop5Share} stocks (#1 for ${bondFirstFor})`,
  `on ${collapsed.length} of ${stockCount} stocks the tuned model collapsed`,
  `ROC-AUC averaged ${ensembleAuc}`,
  `its ${lstmF1About} F1`,
  `split for ${bondSplitFor.replace(' and ', ', ')} and ${bondOppositeFor}`,
  `TSLA: ${bondRankOf('TSLA')} by SHAP, ${bondCorrelationRankOf('TSLA')} by correlation`,
  // Typed facts, frozen with the results and read back from the notebook by hand.
  '27 engineered features',
  'the 9 expected by chance',
  `${rankGapRange.replace(' to ', '–')} positions`,
  'Two-person project',
  profile.location,
  '60-day window',
  '3 layers, hidden size 128',
  education.school,
  education.degree.split(' — ')[0],
  education.period,
];
// The site's "Machine Learning, Software & QA Engineer" is listed as separate roles on the résumé.
for (const role of profile.role.replace(' Engineer', '').split(/, | & /)) {
  if (!resumeText.includes(`${role} Engineer`) && !resumeText.includes(`${role} roles`)) {
    failures.push(`resume/resume.html should list the role ${role}`);
  }
}
for (const claim of resumeClaims) {
  if (!resumeText.includes(claim)) failures.push(`resume/resume.html should say “${claim}”`);
}
// Every skill on the site is on the résumé as a whole item, allowing for the two it words differently.
const resumeWording = { 'REST APIs': 'REST API design', 'Testing (TDD)': 'automated testing (TDD)' };
const skillsBlock = resumeText.slice(resumeText.indexOf('Technical skills'));
const resumeSkills = [...skillsBlock.matchAll(/<dd>(.*?)<\/dd>/g)]
  .flatMap(([, line]) => line.split(' – ')[0].split(', ').map((item) => item.trim()));
for (const skill of skills.flatMap((group) => group.items)) {
  if (!resumeSkills.includes(resumeWording[skill] ?? skill)) failures.push(`resume/resume.html should list the skill ${skill}`);
}

// The public résumé and site must never carry a phone number; the private résumé is kept outside
// this repo. Every text source the site or résumé is built from is scanned, in any number format.
// The PDF's hash ties it to resume.html, so checking the source covers it too.
// Every tracked file is scanned, not chosen folders: a number in a code comment is just as public.
// The git hooks run the same scan on each commit, before anything is pushed (scripts/check-phone.mjs).
const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
for (const file of tracked) {
  const found = phonesIn(readFileSync(resolve(root, file)));
  if (found.length) failures.push(`${file} contains a phone number (${found.length})`);
}

// The PDF is built from resume.html by hand (npm run resume), which records both files' hashes.
// If either has changed since, the live PDF is not the one this source builds.
const pdf = existsSync(pub(profile.resume)) ? readFileSync(pub(profile.resume)).toString('latin1') : '';
const recorded = existsSync(resolve(root, 'resume/resume.sha256')) ? read('resume/resume.sha256').split(/\s+/) : [];
if (recorded[0] !== sha256(resume.replaceAll('\r\n', '\n'))
  || !pdf || recorded[1] !== sha256(Buffer.from(pdf, 'latin1'))) {
  failures.push('the résumé PDF was not built from resume/resume.html as committed; run npm run resume and commit both');
}

// The PDF is what recruiters download, so it must stay on one page and in the résumé's own font.
// Chrome falls back to another font without a word when a character is missing from STIX.
const pages = pdf.match(/\/Type\s*\/Page\b(?!s)/g)?.length ?? 0;
if (pages !== 1) failures.push(`the résumé PDF has ${pages} pages, expected 1`);
const fonts = [...new Set([...pdf.matchAll(/\/BaseFont\s*\/([^\s/>]+)/g)].map((m) => m[1]))];
const stray = fonts.filter((font) => !font.includes('STIXTwoText'));
if (!fonts.length || stray.length) {
  failures.push(`the résumé PDF uses fonts other than STIX Two Text: ${stray.join(', ') || 'none found'}`);
}

// The contact details are typed into the résumé and share image too, so a change in data.js has
// to reach them. The share image is a PNG built by hand, so this checks only its source.
const bare = (url) => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
const contacts = [
  profile.email,
  ...[profile.site, profile.linkedin, profile.github, projects.find((p) => p.caseStudy).link].map(bare),
];
for (const contact of contacts) {
  if (!resumeText.includes(contact)) failures.push(`resume/resume.html should include ${contact} (from src/data.js)`);
}
const shareSource = read('og/og-image.html');
for (const detail of [bare(profile.site), profile.name, profile.role.replace('&', '&amp;')]) {
  if (!shareSource.includes(detail)) failures.push(`og/og-image.html should include ${detail} (from src/data.js)`);
}
// The share image is captured from this file by hand, so an edit here means the PNG is out of date.
const shareSourceHash = '60908746c14395ec8b67374c65c45f73e4253ce1579b1fda2a5db81260d4b5b9';
if (sha256(shareSource.replaceAll('\r\n', '\n')) !== shareSourceHash) {
  failures.push('og/og-image.html changed: rebuild public/og-image.png, then update both hashes (scripts/checks/)');
}
if (!read('index.html').includes(profile.email)) failures.push(`index.html's noscript text should include ${profile.email}`);

export const summary = [
  `résumé matches ${resumeClaims.length} CS403 and education facts, all skills and ${contacts.length} contact details`,
  `résumé PDF is one page in ${fonts.length} STIX fonts, and its recorded hashes match`,
];
