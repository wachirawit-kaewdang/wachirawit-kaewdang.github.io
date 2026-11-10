// All site content lives here, so updating the portfolio never means touching layout code.
// The CS403 numbers come from metrics.js, which computes them from the notebook's outputs.
import {
  collapsed, notebookUrl, rankGapRange, sectorCount, source, stockCount, table1Rows,
} from './metrics.js';

const collapsedShare = `${collapsed.length} of ${stockCount}`;

// Prose that points into Appendix A is written as a list of pieces: strings, and refs that the
// page renders as cross-references, e.g. ['see ', appendix('A.2', 'appendix-a2')].
// A cross-reference into Appendix A. `about` names what is there, shown after the number, since
// "A.4" alone tells a reader nothing. A table ref's caption already says what the table holds.
const appendix = (label, to, about) => ({ label: `Appendix ${label}`, to, about });
const tableA2 = { label: 'Table A.2', to: 'table-a2', about: 'the always-up check, stock by stock' };
const tableA3 = { label: 'Table A.3', to: 'table-a3', about: 'every model’s averages' };

// Every GitHub and site URL is built from the username. A rename also has to reach the résumé and
// share image, which are typed by hand; npm run check fails until they match.
const username = 'wachirawit-kaewdang';
const github = `https://github.com/${username}`;

export const profile = {
  name: 'Wachirawit Kaewdang',
  nickname: 'Ohm',
  // A new graduate's honest title; the roles wanted are in `status`.
  role: 'Computer Science graduate · ML and software',
  location: 'Bangkok, Thailand',
  email: 'wachirawit.kaewdang@gmail.com',
  github,
  // The published site; index.html's share tags are filled from this at build time.
  site: `https://${username}.github.io/`,
  linkedin: 'https://www.linkedin.com/in/wachirawit-kaewdang',
  resume: 'Wachirawit_Kaewdang_Resume.pdf',
  source: `${github}/${username}.github.io`,
  summary:
    'Computer Science graduate (Software Engineering track, May 2026) from Thammasat University, ' +
    'working across machine learning and full-stack web development (React, Node.js).',
  status: 'Open to Machine Learning Engineer, Software Engineer and QA roles in Bangkok or remote.',
};

export const projects = [
  {
    title: 'Stock Direction Prediction with Explainable AI',
    context: 'Senior project (CS403) · 2-person team',
    featured: true,
    summary:
      `An LSTM with self-attention that predicts 3-day price direction for ${stockCount} US stocks across ` +
      `${sectorCount} sectors, used to compare SHAP explanations with plain correlation, ` +
      'with results set against a naive baseline.',
    // Opens the abstract: the skill first, then the catch as proof of it. No metric here.
    finding: [
      'I test my own results against a simple baseline. In my senior project, that check showed my LSTM ' +
        `did no better than always predicting “up” on ${collapsedShare} stocks, so I reported the honest result (`,
      appendix('A.4', 'appendix-a4', 'the baseline check'),
      ')',
    ],
    results: {
      // The caption leads with what the numbers mean, so the F1 column is never read alone.
      caption: [
        `On ${collapsedShare} stocks the tuned LSTM said “up” every test day, so it scored exactly what always ` +
          'saying “up” scores. F1 is a 0–1 score for spotting “up” days. Stock by stock: ',
        tableA2,
        '.',
      ],
      note: [
        'Test set: the last 20% of Jan 2020 – Apr 2025, which the LSTM’s threshold was tuned on. Every model’s averages: ',
        tableA3,
        '. Source: ',
        { label: `Project-CS403 @ ${source.commit}`, href: notebookUrl },
        '.',
      ],
      columns: ['Model', 'F1'],
      // Two rows with one value: the tie shows without bold, which would mark every row.
      rows: table1Rows,
    },
    // The details (the architecture, SHAP findings, the baseline check, what I'd change) live in
    // Appendix A; here only what a reader needs before choosing to go there.
    points: [
      [
        `SHAP and Pearson correlation ranked features ${rankGapRange} positions apart on average, about what ` +
          'unrelated rankings give, and retraining on each method’s top features did not favour SHAP; see ',
        appendix('A.3', 'appendix-a3', 'SHAP against correlation'),
        '.',
      ],
      'My part: data collection and preparation, the training approach and model architecture, the SHAP analysis together with my teammate, and the baseline check that exposed the collapse.',
    ],
    tech: ['Python', 'PyTorch', 'SHAP', 'scikit-learn', 'pandas', 'NumPy', 'Jupyter', 'yfinance', 'Git'],
    caseStudy: '#/cs403',
    link: `${github}/Project-CS403`,
  },
  {
    title: 'HTTP Web Server from Scratch',
    context: 'CS322 Computer Networks · solo',
    summary:
      'An HTTP/1.0 server written directly on Python sockets — no frameworks — serving an ' +
      'HTML page and a GIF with the right content-type headers, and returning 404 for anything else.',
    points: [
      'How it works: one loop accepts a connection, reads the request line, and answers with one of two known files and its content type, or a 404 page. It serves one client at a time.',
      'The page is sent as encoded text and the image as raw bytes; sending both the same way would corrupt the GIF.',
    ],
    // Output from running the server, shown in place of code that can't be published. Only the
    // headers are shown; each line below was printed by the server's responses to curl.
    sample: {
      lines: [
        '$ curl -i http://localhost:5013/mypage.htm',
        'HTTP/1.0 200 OK',
        'Content-Type: text/html',
        '',
        '$ curl -i http://localhost:5013/myimage.gif',
        'HTTP/1.0 200 OK',
        'Content-Type: image/gif',
        '',
        '$ curl -i http://localhost:5013/other',
        'HTTP/1.0 404 Not Found',
        'Content-Type: text/html',
      ],
      caption: 'The headers the server sent for the page, the image and an unknown path, captured with curl. The page and image bodies are left out.',
    },
    tech: ['Python', 'Sockets', 'TCP/IP', 'HTTP'],
    codeNote: 'Course assignment; code not published.',
  },
  {
    title: 'Recipe Web Application',
    context: 'CS369 · 5-person team',
    summary:
      'A full-stack recipe app: a React + Vite frontend with client-side routing, backed by a ' +
      'Node.js / Express REST API.',
    points: [
      'How it fits together: the React pages call an Express REST API, which stores users and recipes in MongoDB through Mongoose.',
      'My part: the MyRecipe management feature, recipe deletion (the API endpoint and a confirm-before-delete step), and wiring the sign-up page and other pages to the backend API.',
    ],
    // The app's own front end, run for this screenshot with made-up recipes from a stand-in server,
    // so no real user or team data is shown.
    shot: {
      src: 'recipe/myrecipe.png',
      width: 768,
      height: 665,
      alt: 'The My Recipe page: two recipe cards, Garlic Pepper Pork and Mango Sticky Rice, each with Edit and Delete buttons.',
      caption: 'The MyRecipe page I built, running with two made-up recipes from a stand-in server, not the team’s database.',
    },
    tech: ['React', 'Vite', 'JavaScript', 'HTML/CSS', 'Node.js', 'Express', 'REST APIs', 'MongoDB'],
    // The repository is a private GitHub Classroom repo, so there is nothing public to link.
    codeNote: 'In a private course repository (GitHub Classroom), so it cannot be linked.',
  },
  {
    title: 'This Portfolio and Its Data Checks',
    context: 'Personal project · I directed and reviewed; Claude Code wrote the code',
    summary:
      'The site you are reading, and the automated tests that keep its claims true: the CS403 tables are ' +
      'computed from the notebook’s saved outputs, and nothing deploys until every check passes.',
    points: [
      'On every push, CI rebuilds the CS403 numbers from the notebook, checks the résumé against its source and opens ' +
        'both pages in headless Chrome; any mismatch stops the deploy. In QA terms, each check is a test case for a claim on the site.',
      'My part: setting the goals, choosing between approaches, reviewing every change before it shipped, and running ' +
        'repeated design and code reviews whose findings became new checks.',
    ],
    tech: ['React', 'Vite', 'JavaScript', 'Python', 'GitHub Actions', 'Node.js test runner', 'Headless Chrome'],
    link: `${github}/${username}.github.io`,
  },
];

export const skills = [
  { group: 'Languages', items: ['Python', 'JavaScript', 'Java', 'C', 'C++', 'SQL'] },
  { group: 'ML & Data', items: ['PyTorch', 'scikit-learn', 'SHAP', 'pandas', 'NumPy', 'Jupyter'] },
  { group: 'Web', items: ['React', 'Vite', 'Node.js', 'Express', 'Django', 'REST APIs', 'HTML/CSS'] },
  { group: 'Data & Tools', items: ['MySQL', 'MongoDB', 'Git', 'Docker', 'Testing (TDD)', 'Robot Framework'] },
];

export const education = {
  school: 'Thammasat University',
  degree: 'BSc Computer Science (Computer and Information Science major) — Software Engineering track',
  period: '2022 – May 2026',
};

export const languages = [
  { name: 'Thai', level: 'Native' },
  { name: 'English', level: 'Conversational' },
];
