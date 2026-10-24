import { useEffect, useState } from 'react';
import { profile, projects, skills, education, languages } from './data.js';
import { Ref, LinkLine, NumberedTable } from './paper.jsx';
import { asset, jumpTo } from './paper-utils.js';
import ProjectCS403 from './ProjectCS403.jsx';

// The page is laid out like a preprint: numbered sections and subsections that the text can
// point at ("§1.1", "Table 1"), the way a paper's cross-references do.
const sections = [
  { id: 'projects', title: 'Projects' },
  { id: 'skills', title: 'Skills' },
  { id: 'education', title: 'Education and languages' },
  { id: 'contact', title: 'Contact' },
];
const sectionNumber = (id) => sections.findIndex((s) => s.id === id) + 1;
const projectId = (i) => `project-${i + 1}`;

// A skill counts as shown when some project above lists it, so the split stays true as
// projects are added without a second list to maintain.
const shownInProjects = new Set(projects.flatMap((p) => p.tech));

// Tiny hash router: "#/cs403" shows the case study, anything else shows the home page.
// Hash URLs work on GitHub Pages without any server configuration.
function useHash() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return hash;
}

function RunningHead() {
  return (
    <header className="runhead">
      <div className="page runhead-inner">
        <a href="#top" className="runhead-name">{profile.name}</a>
        <nav aria-label="Sections">
          {sections.map((s, i) => (
            <a key={s.id} href={`#${s.id}`}>
              <span className="num">{i + 1}</span> {s.id === 'education' ? 'Education' : s.title}
            </a>
          ))}
          <a className="runhead-resume" href={asset(profile.resume)} target="_blank" rel="noreferrer">
            Résumé
          </a>
        </nav>
      </div>
    </header>
  );
}

function TitleBlock() {
  return (
    <header id="top" className="titleblock">
      <h1>
        {profile.name} <span className="nick">({profile.nickname})</span>
      </h1>
      <p className="authorline">
        <span className="role">{profile.role}</span>
        <span>{education.school}</span> <span>{profile.location}</span>
      </p>
      <LinkLine className="contactline">
        <a className="primary" href={asset(profile.resume)} target="_blank" rel="noreferrer">
          Résumé (PDF)
        </a>
        <a href={profile.github} target="_blank" rel="noreferrer">GitHub</a>
        <a href={profile.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>
        <a href={`mailto:${profile.email}`}>Email</a>
      </LinkLine>
    </header>
  );
}

function Abstract() {
  const featured = projects.findIndex((p) => p.results);
  return (
    <section className="abstract" aria-label="Abstract">
      <p>
        <strong>Abstract.</strong> {profile.summary}
        {featured >= 0 && (
          <>
            {' '}Main result: <Ref to="table-1">Table 1</Ref> in{' '}
            <Ref to={projectId(featured)}>§{sectionNumber('projects')}.{featured + 1}</Ref>.
          </>
        )}
      </p>
      <p className="availability">
        <strong>Availability.</strong> {profile.status}
      </p>
    </section>
  );
}

function SectionHeading({ id }) {
  const s = sections.find((x) => x.id === id);
  return (
    <h2>
      <span className="num">{sectionNumber(id)}</span>
      {s.title}
    </h2>
  );
}

function Project({ project, index }) {
  const number = `${sectionNumber('projects')}.${index + 1}`;
  return (
    <article id={projectId(index)} className="subsection" tabIndex={-1}>
      <h3>
        <span className="num">{number}</span>
        {project.title}
      </h3>
      <p className="context">{project.context}</p>
      <p>{project.summary}</p>

      {project.results && <NumberedTable number={1} {...project.results} />}

      {project.points.length > 0 && (
        <ul>
          {project.points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      )}

      <p className="meta">
        <em>Stack.</em> {project.tech.join(' · ')}
      </p>
      {project.caseStudy && (
        <p className="meta">
          <em>Case study.</em> <a href={project.caseStudy}>Method, findings and the baseline check</a>
        </p>
      )}
      {project.link && (
        <p className="meta">
          <em>Code.</em>{' '}
          <a href={project.link} target="_blank" rel="noreferrer">
            {project.link.replace(/^https?:\/\//, '')}
          </a>
        </p>
      )}
    </article>
  );
}

function Projects() {
  return (
    <section id="projects" className="section" tabIndex={-1}>
      <SectionHeading id="projects" />
      {projects.map((project, i) => (
        <Project key={project.title} project={project} index={i} />
      ))}
    </section>
  );
}

function Skills() {
  return (
    <section id="skills" className="section" tabIndex={-1}>
      <SectionHeading id="skills" />
      <p>
        Each group starts with what the projects in{' '}
        <Ref to="projects">§{sectionNumber('projects')}</Ref> show, then what I have also used.
      </p>
      <dl className="skills">
        {skills.map((s) => {
          const shown = s.items.filter((item) => shownInProjects.has(item));
          const also = s.items.filter((item) => !shownInProjects.has(item));
          return (
            <div key={s.group}>
              <dt>{s.group}</dt>
              {shown.length > 0 && <dd>{shown.join(', ')}</dd>}
              {also.length > 0 && (
                <dd className="also">
                  <em>Also used:</em> {also.join(', ')}
                </dd>
              )}
            </div>
          );
        })}
      </dl>
    </section>
  );
}

function Background() {
  return (
    <section id="education" className="section" tabIndex={-1}>
      <SectionHeading id="education" />
      <dl className="facts">
        <div>
          <dt>{education.school}</dt>
          <dd>{education.degree}</dd>
          <dd className="also">{education.period}</dd>
        </div>
        {languages.map((l) => (
          <div key={l.name}>
            <dt>{l.name}</dt>
            <dd>{l.level}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Contact() {
  return (
    <section id="contact" className="section" tabIndex={-1}>
      <SectionHeading id="contact" />
      <p>The quickest way to reach me is email or LinkedIn.</p>
      <LinkLine className="contactline left">
        <a className="primary" href={`mailto:${profile.email}`}>{profile.email}</a>
        <a href={profile.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>
        <a href={asset(profile.resume)} target="_blank" rel="noreferrer">Résumé (PDF)</a>
      </LinkLine>
    </section>
  );
}

export default function App() {
  const hash = useHash();
  const isCaseStudy = hash === '#/cs403';

  // After switching pages, land in the right place: the top of the case study, or the
  // section the home-page link named.
  useEffect(() => {
    if (isCaseStudy) {
      window.scrollTo(0, 0);
    } else if (hash.length > 1) {
      document.getElementById(hash.slice(1))?.scrollIntoView();
    }
  }, [hash, isCaseStudy]);

  return (
    <>
      {/* Focuses the content in place, so it works on either page without changing the route. */}
      <a className="skip" href="#main" onClick={(e) => jumpTo('main', { tint: false }) && e.preventDefault()}>
        Skip to content
      </a>
      <RunningHead />
      {isCaseStudy ? (
        <ProjectCS403 />
      ) : (
        <main id="main" className="page" tabIndex={-1}>
          <TitleBlock />
          <Abstract />
          <Projects />
          <Skills />
          <Background />
          <Contact />
        </main>
      )}
      <footer className="page footer">
        © {new Date().getFullYear()} {profile.name} · Built with React + Vite
      </footer>
    </>
  );
}
