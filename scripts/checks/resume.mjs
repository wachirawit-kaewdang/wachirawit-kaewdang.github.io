// The résumé and share image are typed by hand, so they are compared with the site: its CS403
// numbers, facts, skills and contact details, and the PDF's page count, fonts and source.
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { education, profile, projects, skills } from '../../src/data.js';
import {
  bondCorrelationRankOf, bondFirstFor, bondOppositeFor, bondRankOf, bondSplitFor, bondTop5Share, collapsed, ensembleAuc,
  lstmF1About, rankGapRange, sectorCount, stockCount,
} from '../../src/metrics.js';
import { shareSourceHash } from './pins.mjs';
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
// The roles in the site's "Looking for" line ("Open to Machine Learning Engineer, Software
// Engineer and QA roles …") must each be on the résumé too.
const wanted = profile.status.replace(/^Open to /, '').replace(/ roles\b.*$/, '').split(/, | and /);
for (const role of wanted) {
  if (!resumeText.includes(role)) failures.push(`resume/resume.html should list the role ${role}`);
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

// The PDF can't be scanned for a phone number, so its hash ties it to resume.html, which is. The
// git hooks compare the same hashes before each commit and push (scripts/phone-sources.mjs).

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
if (sha256(shareSource.replaceAll('\r\n', '\n')) !== shareSourceHash) {
  failures.push('og/og-image.html changed: rebuild public/og-image.png, then update both hashes (scripts/checks/)');
}
if (!read('index.html').includes(profile.email)) failures.push(`index.html's noscript text should include ${profile.email}`);

export const summary = [
  `résumé matches ${resumeClaims.length} CS403 and education facts, all skills and ${contacts.length} contact details`,
  `résumé PDF is one page in ${fonts.length} STIX fonts, and its recorded hashes match`,
];
