import { useEffect, useState } from 'react';
import { profile, projects, skills, education, languages } from './data.js';
import { ExtLink, Ref, LinkLine, NumberedTable } from './paper.jsx';
import { APPENDIX, asset, jumpTo } from './paper-utils.js';
import { useReadingPlace } from './useReadingPlace.js';
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

// The section the reader is in: the last one whose top has risen above 30% of the window, so the
// menu changes soon after a new heading arrives rather than while the old section still fills the
// screen. At the very end short sections can't get that high, so there it's the one just linked to,
// or else the last.
const SPY_LINE = 0.3;
const homeSections = sections.map((s) => s.id);
const appendixSections = [1, 2, 3, 4, 5, 6].map((n) => `appendix-a${n}`);

function useCurrentSection(ids) {
  const [current, setCurrent] = useState(null);
  useEffect(() => {
    const update = () => {
      const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      const started = ids.filter((id) =>
        document.getElementById(id)?.getBoundingClientRect().top < window.innerHeight * SPY_LINE);
      // A section just linked to wins while it's near the top, even if a short one follows it.
      const named = window.location.hash.replace(/^.*[#/]/, '');
      const namedTop = ids.includes(named) ? document.getElementById(named)?.getBoundingClientRect().top : null;
      const landed = namedTop != null && namedTop >= 0 && namedTop < window.innerHeight * SPY_LINE;
      setCurrent(landed ? named : atEnd ? ids.at(-1) : started.at(-1) ?? null);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('hashchange', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('hashchange', update);
    };
  }, [ids]);
  return current;
}

// On the home page the running head lists the numbered sections. On Appendix A those numbers
// would clash with A.1–A.6, so it offers the way back, the code and the résumé instead.
function RunningHead({ appendix }) {
  const featured = projects.find((p) => p.caseStudy);
  const current = useCurrentSection(appendix ? appendixSections : homeSections);
  return (
    <header className="runhead">
      <div className="page runhead-inner">
        <a href="#top" className="runhead-name">{profile.name}</a>
        <nav aria-label={appendix ? 'Site' : 'Sections'}>
          {appendix ? (
            <>
              <a href={`#${projectId(0)}`} aria-label={`Back to the portfolio, section ${sectionNumber('projects')}.1`}>
                ← Portfolio
              </a>
              {/* Doubles as the reader's position in a long page. A phone has room for one word, and
                  "Contents" says where the link goes; the section number stays in the link's name. */}
              <Ref route={APPENDIX} to="appendix-contents">
                Contents
                {current?.startsWith('appendix-a') && <span className="wide">, {current.replace('appendix-a', 'A.')}</span>}
              </Ref>
              {featured?.link && <ExtLink href={featured.link}>Code</ExtLink>}
              <a href={`mailto:${profile.email}`}>Email</a>
            </>
          ) : (
            sections.map((s, i) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                aria-label={`${i + 1} ${s.title}`}
                aria-current={s.id === current ? 'location' : undefined}
              >
                <span className="num">{i + 1}</span>{' '}
                {/* The menu shows the heading's first word, so five items still fit a phone screen;
                    the full title is in the link's accessible name above. */}
                {s.title.split(' ')[0]}
              </a>
            ))
          )}
          <ExtLink className="runhead-resume" href={asset(profile.resume)}>
            Résumé
          </ExtLink>
        </nav>
      </div>
    </header>
  );
}

function TitleBlock() {
  return (
    <header id="top" className="titleblock" tabIndex={-1}>
      <h1>
        {profile.name} <span className="nick">({profile.nickname})</span>
      </h1>
      <p className="authorline">
        <span className="role">{profile.role}</span>
        <span>{education.school}</span> <span>{profile.location}</span>
      </p>
      <LinkLine className="contactline">
        {/* data-print: a paper copy shows where the résumé lives, not a relative path. */}
        <ExtLink className="primary" href={asset(profile.resume)} data-print={`${profile.site}${profile.resume}`}>
          Résumé (PDF)
        </ExtLink>
        <ExtLink href={profile.github}>GitHub</ExtLink>
        <ExtLink href={profile.linkedin}>LinkedIn</ExtLink>
        {/* The address itself, so it can be copied where no mail app opens a mailto link. */}
        <a href={`mailto:${profile.email}`}>{profile.email}</a>
      </LinkLine>
    </header>
  );
}

// Renders data.js prose: a plain string, or a list of strings and { label, to } refs into
// Appendix A, which become cross-references that open the appendix at that anchor.
function Prose({ pieces }) {
  return [pieces].flat().map((piece, i) =>
    typeof piece === 'string' ? piece : piece.href ? (
      <ExtLink key={i} href={piece.href}>{piece.label}</ExtLink>
    ) : (
      <Ref key={i} route={APPENDIX} to={piece.to} name={piece.about && `${piece.label}, ${piece.about}`} print={`${profile.site}${APPENDIX}/${piece.to}`}>
        {/* An appendix section's topic is shown, since "A.4" alone says nothing; a table's
            caption already says what it holds, so only screen readers hear its topic. */}
        {piece.about && piece.label.startsWith('Appendix') ? `${piece.label}, ${piece.about}` : piece.label}
      </Ref>
    ));
}

// The 10-second version for a recruiter: the roles wanted, and where to start reading. It states
// no result, because the abstract right below leads with it. Contact links sit once, in the title
// block above.
function AtAGlance() {
  const featured = projects.findIndex((p) => p.results);
  return (
    <dl className="glance" aria-label="At a glance">
      <div>
        <dt>Looking for</dt>
        <dd>{profile.status.replace(/^Open to /, '').replace(/\.$/, '')}</dd>
      </div>
      <div>
        <dt>Start with</dt>
        <dd>
          <Ref to={projectId(featured)}>{projects[featured].title}</Ref> (§{sectionNumber('projects')}.{featured + 1}),
          with <ExtLink href={projects[featured].link}>its code on GitHub</ExtLink>
        </dd>
      </div>
    </dl>
  );
}

function Abstract() {
  const featured = projects.findIndex((p) => p.results);
  return (
    <section className="abstract" aria-label="Abstract">
      {/* Leads with the finding, the strongest evidence of how I work; the summary backs it up. */}
      <p>
        <strong>Abstract.</strong>{' '}
        {featured >= 0 && (
          <>
            <Prose pieces={projects[featured].finding} />.
          </>
        )}
      </p>
      <p>{profile.summary}</p>
    </section>
  );
}

function SectionHeading({ id }) {
  const s = sections.find((x) => x.id === id);
  return (
    <h2 id={`${id}-title`}>
      <span className="num">{sectionNumber(id)}</span>{' '}
      {s.title}
    </h2>
  );
}

function Project({ project, index }) {
  const number = `${sectionNumber('projects')}.${index + 1}`;
  return (
    <article id={projectId(index)} className="subsection" tabIndex={-1} aria-labelledby={`${projectId(index)}-title`}>
      <h3 id={`${projectId(index)}-title`}>
        <span className="num">{number}</span>{' '}
        {project.title}
      </h3>
      <p className="context">{project.context}</p>
      <p>{project.summary}</p>
      {project.caseStudy && (
        <p className="seealso">
          Full case study in <a href={project.caseStudy}>Appendix A</a>: the method, the baseline
          check and what I would change.
        </p>
      )}

      {project.results && (
        <NumberedTable
          number={1}
          {...project.results}
          caption={<Prose pieces={project.results.caption} />}
          note={<Prose pieces={project.results.note} />}
        />
      )}

      {project.points.length > 0 && (
        <ul>
          {project.points.map((point, i) => (
            <li key={i}><Prose pieces={point} /></li>
          ))}
        </ul>
      )}

      {project.shot && (
        <figure className="shot">
          <img src={asset(project.shot.src)} width={project.shot.width} height={project.shot.height} alt={project.shot.alt} loading="lazy" decoding="async" />
          <figcaption>{project.shot.caption}</figcaption>
        </figure>
      )}

      {project.sample && (
        <figure className="sample">
          {/* tabIndex: a long line scrolls sideways, and a keyboard reader must be able to reach it. */}
          <pre tabIndex={0} aria-label="Terminal output from the server">{project.sample.lines.join('\n')}</pre>
          <figcaption>{project.sample.caption}</figcaption>
        </figure>
      )}

      <p className="meta">
        <em>Stack.</em> {project.tech.join(' · ')}
      </p>
      {project.link && (
        <p className="meta">
          <em>Code.</em>{' '}
          <ExtLink href={project.link}>
            {project.link.replace(/^https?:\/\//, '')}
          </ExtLink>
        </p>
      )}
      {!project.link && project.codeNote && (
        <p className="meta">
          <em>Code.</em> {project.codeNote}
        </p>
      )}
    </article>
  );
}

function Projects() {
  return (
    <section id="projects" className="section" tabIndex={-1} aria-labelledby="projects-title">
      <SectionHeading id="projects" />
      {projects.map((project, i) => (
        <Project key={project.title} project={project} index={i} />
      ))}
    </section>
  );
}

function Skills() {
  return (
    <section id="skills" className="section" tabIndex={-1} aria-labelledby="skills-title">
      <SectionHeading id="skills" />
      <p>
        Each group lists first the skills that the projects in{' '}
        <Ref to="projects">§{sectionNumber('projects')} Projects</Ref> use, then the ones I have used
        elsewhere, with no project here to show for them.
      </p>
      <dl className="skills">
        {skills.map((s) => {
          const shown = s.items.filter((item) => shownInProjects.has(item));
          const also = s.items.filter((item) => !shownInProjects.has(item));
          return (
            <div key={s.group}>
              <dt>{s.group}</dt>
              {shown.length > 0 && (
                <dd>
                  <em className="tag">In the projects:</em> {shown.join(', ')}
                </dd>
              )}
              {also.length > 0 && (
                <dd className="also">
                  <em className="tag">Used, not shown here:</em> {also.join(', ')}
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
    <section id="education" className="section" tabIndex={-1} aria-labelledby="education-title">
      <SectionHeading id="education" />
      <dl className="facts">
        <div>
          <dt>{education.school}</dt>
          <dd>{education.degree}</dd>
          <dd className="also">{education.period}</dd>
        </div>
        <div>
          <dt>Languages</dt>
          {languages.map((l) => (
            <dd key={l.name}>{l.name}: {l.level.toLowerCase()}</dd>
          ))}
        </div>
      </dl>
    </section>
  );
}

function Contact() {
  return (
    <section id="contact" className="section" tabIndex={-1} aria-labelledby="contact-title">
      <SectionHeading id="contact" />
      {/* The title block holds the full set of links; here the two ways to start a conversation. */}
      <p>Happy to talk through any of this. Email is quickest, or LinkedIn.</p>
      <LinkLine className="contactline left">
        <a className="primary" href={`mailto:${profile.email}`}>{profile.email}</a>
        <ExtLink href={profile.linkedin}>LinkedIn</ExtLink>
      </LinkLine>
    </section>
  );
}

export default function App() {
  const hash = useHash();
  // "#/cs403" and anything under it ("#/cs403/figure-a1") is the appendix.
  const isCaseStudy = hash === APPENDIX || hash.startsWith(`${APPENDIX}/`);
  const [missing, setMissing] = useState(false);
  useReadingPlace({ hash, isCaseStudy, home: projectId(0), setMissing });

  return (
    <>
      {/* Focuses the content in place, so it works on either page without changing the route. */}
      <a className="skip" href="#main" onClick={(e) => jumpTo('main', { tint: false }) && e.preventDefault()}>
        Skip to content
      </a>
      <RunningHead appendix={isCaseStudy} />
      <p className="page notice" role="status">
        {missing && 'That link points to a section that doesn’t exist, so this is the start of the page.'}
      </p>
      {isCaseStudy ? (
        <ProjectCS403 />
      ) : (
        <main id="main" className="page" tabIndex={-1}>
          <TitleBlock />
          <AtAGlance />
          <Abstract />
          <Projects />
          <Skills />
          <Background />
          <Contact />
        </main>
      )}
      <footer className="page footer">
        © {new Date().getFullYear()} {profile.name} ·{' '}
        <ExtLink href={profile.source}>Site source on GitHub</ExtLink>
      </footer>
    </>
  );
}
