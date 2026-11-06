import { useEffect, useRef, useState } from 'react';
import { profile, projects, skills, education, languages } from './data.js';
import { ExtLink, Ref, LinkLine, NumberedTable } from './paper.jsx';
import { APPENDIX, asset, jumpTo, refTrail } from './paper-utils.js';
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

// The page's own title from index.html, restored when leaving the appendix.
const homeTitle = document.title;

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

// The section the reader is in: the last one to start above the middle of the window. At the very
// end short sections can't get that high, so there it's the one just linked to, or else the last.
const homeSections = sections.map((s) => s.id);
const appendixSections = [1, 2, 3, 4, 5, 6].map((n) => `appendix-a${n}`);

function useCurrentSection(ids) {
  const [current, setCurrent] = useState(null);
  useEffect(() => {
    const update = () => {
      const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      const started = ids.filter((id) =>
        document.getElementById(id)?.getBoundingClientRect().top < window.innerHeight * 0.5);
      const named = window.location.hash.replace(/^.*[#/]/, '');
      setCurrent(atEnd ? (ids.includes(named) ? named : ids.at(-1)) : started.at(-1) ?? null);
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
              {/* Doubles as the reader's position in a long page; on a phone the number alone fits. */}
              <Ref route={APPENDIX} to="appendix-contents">
                {current?.startsWith('appendix-a') ? (
                  <><span className="wide">Contents, </span>{current.replace('appendix-a', 'A.')}</>
                ) : 'Contents'}
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
                {s.id === 'education' ? 'Education' : s.title}
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
        <ExtLink className="primary" href={asset(profile.resume)}>
          Résumé (PDF)
        </ExtLink>
        <ExtLink href={profile.github}>GitHub</ExtLink>
        <ExtLink href={profile.linkedin}>LinkedIn</ExtLink>
        <a href={`mailto:${profile.email}`}>Email</a>
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
      <Ref key={i} route={APPENDIX} to={piece.to}>{piece.label}</Ref>
    ));
}

function Abstract() {
  const featured = projects.findIndex((p) => p.results);
  return (
    <section className="abstract" aria-label="Abstract">
      <p>
        <strong>Abstract.</strong> {profile.summary}
      </p>
      {featured >= 0 && (
        <p>
          <strong>Main result</strong> (<Ref to="table-1">Table 1</Ref>,{' '}
          <Ref to={projectId(featured)}>§{sectionNumber('projects')}.{featured + 1}</Ref>).{' '}
          <Prose pieces={projects[featured].finding} />.
        </p>
      )}
      <p className="availability">
        <strong>Availability.</strong> {profile.status}
      </p>
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
          Full write-up in <a href={project.caseStudy}>Appendix A</a>: the method, the baseline
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
    <section id="education" className="section" tabIndex={-1} aria-labelledby="education-title">
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
    <section id="contact" className="section" tabIndex={-1} aria-labelledby="contact-title">
      <SectionHeading id="contact" />
      <p>Happy to talk through any of this. Email or LinkedIn is quickest.</p>
      <LinkLine className="contactline left">
        <a className="primary" href={`mailto:${profile.email}`}>{profile.email}</a>
        <ExtLink href={profile.linkedin}>LinkedIn</ExtLink>
        <ExtLink href={asset(profile.resume)}>Résumé (PDF)</ExtLink>
      </LinkLine>
    </section>
  );
}

export default function App() {
  const hash = useHash();
  // "#/cs403" and anything under it ("#/cs403/figure-a1") is the appendix.
  const isCaseStudy = hash === APPENDIX || hash.startsWith(`${APPENDIX}/`);
  // Remembers whether the last route was the appendix, so leaving it with browser Back (which
  // returns to an empty hash) lands the reader on §1.1, where they came from.
  const wasCaseStudy = useRef(false);
  const mounted = useRef(false);
  const [missing, setMissing] = useState(false);
  // Where the reader was on each page when they followed a link, for Back between the two.
  const spots = useRef({ home: null, appendix: null });
  const pageName = () => (wasCaseStudy.current ? 'appendix' : 'home');

  // Back after a cross-reference: focus returns to the link that was followed.
  useEffect(() => {
    const onPop = () => {
      if (refTrail.at(-1)?.from !== window.location.href) return;
      const { link, top } = refTrail.pop();
      // After the browser's own handling: on the home page a hash names a real element, and the
      // browser would otherwise scroll to it and focus it.
      requestAnimationFrame(() => requestAnimationFrame(() => {
        window.scrollTo({ top, behavior: 'instant' });
        if (link.isConnected) link.focus({ preventScroll: true });
      }));
    };
    const onClick = (e) => {
      if (!e.target.closest?.('a[href^="#"]')) return;
      spots.current[pageName()] = window.scrollY;
      setMissing(false);
    };
    window.addEventListener('popstate', onPop);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('popstate', onPop);
      document.removeEventListener('click', onClick, true);
    };
  }, []);

  // After switching pages, land in the right place and say where we are: the tab title names
  // the page, and focus moves to it so a screen reader announces the change. In the appendix
  // that is the anchor the link named, or else its title; at home, the section named.
  useEffect(() => {
    // An entry already marked is the reader returning with Back or Forward. On the same page the
    // browser restores the position itself, and jumping here would fight it.
    const firstLoad = !mounted.current;
    const returning = !firstLoad && history.state?.seen;
    const samePage = wasCaseStudy.current === isCaseStudy;
    mounted.current = true;
    if (!history.state?.seen) history.replaceState({ seen: true }, '');
    if (returning && samePage) return;

    document.title = isCaseStudy ? `Appendix A: Stock Direction Prediction · ${profile.name}` : homeTitle;
    // Back or Forward between the two pages: the browser can't restore a page that wasn't there.
    const spot = returning ? spots.current[isCaseStudy ? 'appendix' : 'home'] : null;
    if (spot !== null) {
      window.scrollTo({ top: spot, behavior: 'instant' });
      document.getElementById('main')?.focus({ preventScroll: true });
      setMissing(false);
      wasCaseStudy.current = isCaseStudy;
      return;
    }

    let found = true;
    if (isCaseStudy) {
      const anchor = hash.slice(APPENDIX.length + 1);
      if (!(anchor && jumpTo(anchor, { tint: false }))) {
        found = !anchor;
        window.scrollTo({ top: 0, behavior: 'instant' });
        // On a fresh load the browser starts at the top, so Tab still meets the running head.
        if (!firstLoad) document.getElementById('appendix-title')?.focus({ preventScroll: true });
      }
    } else {
      const named = hash.length > 1 ? hash.slice(1) : wasCaseStudy.current ? projectId(0) : null;
      const target = named && document.getElementById(named);
      found = !named || Boolean(target);
      if (!found) window.scrollTo({ top: 0, behavior: 'instant' });
      if (target) {
        target.scrollIntoView();
        target.focus({ preventScroll: true });
      }
    }
    setMissing(!found);
    wasCaseStudy.current = isCaseStudy;
  }, [hash, isCaseStudy]);

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
