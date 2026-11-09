// The shape of the content in src/data.js. A slip while moving entries (a project pasted into the
// wrong list) still builds and renders, so the build checks alone can't see it.
import { education, languages, projects, skills } from '../../src/data.js';

// Change this when a project is added or removed on purpose.
const projectCount = 4;

export const failures = [];
if (projects.length !== projectCount) {
  failures.push(`src/data.js lists ${projects.length} projects, expected ${projectCount}: ${projects.map((p) => p.title).join(', ')}`);
}
for (const [i, p] of projects.entries()) {
  for (const key of ['title', 'context', 'summary', 'tech']) {
    if (!p[key]) failures.push(`src/data.js: project ${i + 1} (${p.title ?? 'untitled'}) has no ${key}`);
  }
}
for (const [i, l] of languages.entries()) {
  if (!l.name || !l.level || Object.keys(l).length !== 2) failures.push(`src/data.js: languages entry ${i + 1} is not { name, level }`);
}
if (!skills.length || !education.school) failures.push('src/data.js: skills or education is missing');
export const summary = [`src/data.js has ${projects.length} complete projects and ${languages.length} languages`];
