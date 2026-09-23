import { profile, projects, skills, education, languages } from './data.js';

// Vite serves files from /public at the site root; BASE_URL keeps links correct
// whether the site is deployed at "/" or under a sub-path.
const asset = (path) => `${import.meta.env.BASE_URL}${path}`;

function Header() {
  return (
    <header className="nav">
      <div className="container nav-inner">
        <a href="#top" className="brand">WK</a>
        <nav>
          <a href="#projects">Projects</a>
          <a href="#skills">Skills</a>
          <a href="#contact">Contact</a>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section id="top" className="hero container">
      <p className="eyebrow">{profile.location}</p>
      <h1>
        {profile.name} <span className="muted">({profile.nickname})</span>
      </h1>
      <p className="role">{profile.role}</p>
      <p className="lead">{profile.summary}</p>
      <p className="status">
        <span className="dot" aria-hidden="true" />
        {profile.status}
      </p>
      <div className="actions">
        <a className="btn primary" href={asset(profile.resume)} target="_blank" rel="noreferrer">
          Resume (PDF)
        </a>
        <a className="btn" href={profile.github} target="_blank" rel="noreferrer">GitHub</a>
        <a className="btn" href={profile.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>
      </div>
    </section>
  );
}

function Tags({ items }) {
  return (
    <ul className="tags">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function ProjectCard({ project }) {
  return (
    <article className={project.featured ? 'card featured' : 'card'}>
      {project.featured && <p className="badge">Featured project</p>}
      <h3>{project.title}</h3>
      <p className="context">{project.context}</p>
      <p>{project.summary}</p>

      {project.metrics && (
        <dl className="metrics">
          {project.metrics.map((m) => (
            <div key={m.label}>
              <dt>{m.label}</dt>
              <dd>{m.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {project.points.length > 0 && (
        <ul className="points">
          {project.points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      )}

      <Tags items={project.tech} />

      {project.link && (
        <a className="link" href={project.link} target="_blank" rel="noreferrer">
          View code on GitHub →
        </a>
      )}
    </article>
  );
}

function Projects() {
  return (
    <section id="projects" className="container section">
      <h2>Projects</h2>
      <div className="grid">
        {projects.map((project) => (
          <ProjectCard key={project.title} project={project} />
        ))}
      </div>
    </section>
  );
}

function Skills() {
  return (
    <section id="skills" className="container section">
      <h2>Skills</h2>
      <div className="skills">
        {skills.map((s) => (
          <div key={s.group}>
            <h3>{s.group}</h3>
            <Tags items={s.items} />
          </div>
        ))}
      </div>
    </section>
  );
}

function Background() {
  return (
    <section className="container section two-col">
      <div>
        <h2>Education</h2>
        <p className="strong">{education.school}</p>
        <p>{education.degree}</p>
        <p className="muted">{education.period}</p>
      </div>
      <div>
        <h2>Languages</h2>
        {languages.map((l) => (
          <p key={l.name}>
            <span className="strong">{l.name}</span> — {l.level}
          </p>
        ))}
      </div>
    </section>
  );
}

function Contact() {
  return (
    <section id="contact" className="container section contact">
      <h2>Contact</h2>
      <p>The quickest way to reach me is email or LinkedIn.</p>
      <div className="actions">
        <a className="btn primary" href={`mailto:${profile.email}`}>{profile.email}</a>
        <a className="btn" href={profile.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>
      </div>
    </section>
  );
}

export default function App() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Projects />
        <Skills />
        <Background />
        <Contact />
      </main>
      <footer className="container footer">
        © {new Date().getFullYear()} {profile.name} · Built with React + Vite
      </footer>
    </>
  );
}
