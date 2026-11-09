// All site content lives here, so updating the portfolio never means touching layout code.
// The CS403 numbers come from metrics.js, which computes them from the notebook's outputs.
import {
  aucRange, collapsed, lstmF1About, notebookUrl, rankGapRange, sectorCount, source,
  stockCount, table1Rows,
} from './metrics.js';

const collapsedShare = `${collapsed.length} of ${stockCount}`;

// Prose that points into Appendix A is written as a list of pieces: strings, and refs that the
// page renders as cross-references, e.g. ['see ', appendix('A.2', 'appendix-a2')].
const appendix = (label, to) => ({ label: `Appendix ${label}`, to });
const tableA2 = { label: 'Table A.2', to: 'table-a2' };

// Every GitHub and site URL is built from the username. A rename also has to reach the résumé and
// share image, which are typed by hand; npm run check fails until they match.
const username = 'wachirawit-kaewdang';
const github = `https://github.com/${username}`;

export const profile = {
  name: 'Wachirawit Kaewdang',
  nickname: 'Ohm',
  role: 'Machine Learning & Software Engineer',
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
    // Opens the abstract, ahead of any metric.
    finding: [
      'I check whether results hold up. In my senior project I built an LSTM to predict stock direction ' +
        `and tested it against a simple baseline, always predicting “up”; that showed its ${lstmF1About} F1 ` +
        'wasn’t real skill (',
      appendix('A.4', 'appendix-a4'),
      '); this site rebuilds and tests its own numbers on every deploy',
    ],
    results: {
      // The caption leads with what the numbers mean, so the F1 column is never read alone.
      caption: [
        `Every model here with a recorded ROC-AUC is close to chance, at ${aucRange} where 0.50 is chance, and the tuned ` +
          `LSTM’s high F1 comes from predicting “up” on every test day for ${collapsedShare} stocks (`,
        tableA2,
        ').',
      ],
      note: [
        'Test set: the last 20% of Jan 2020 – Apr 2025. LSTM and ensemble thresholds were tuned on it, so those rows are ' +
          'if anything optimistic; Random Forest and Logistic Regression use the default 0.5. Source: ',
        { label: `Project-CS403 @ ${source.commit}`, href: notebookUrl },
        `. The first two rows cover the ${collapsed.length} stocks where the LSTM collapsed; the rest average all ${stockCount}.`,
      ],
      columns: ['Model', 'F1', 'ROC-AUC'],
      rows: table1Rows,
      // The baseline and the LSTM on the same stocks: the tie the table exists to show.
      emphasis: 2,
    },
    // The details (SHAP findings, the baseline check, what I'd change) live in Appendix A; here
    // only what a reader needs before choosing to go there.
    points: [
      'LSTM + self-attention (3 layers, hidden 128) with Focal Loss, compared with Random Forest, Logistic Regression and a soft-voting ensemble.',
      [
        `SHAP and Pearson correlation ranked features ${rankGapRange} positions apart on average, about what ` +
          'unrelated rankings give, and retraining on each method’s top features did not favour SHAP; see ',
        appendix('A.3', 'appendix-a3'),
        '.',
      ],
      'My part: data collection and preparation, the training approach and model architecture, the SHAP analysis together with my teammate, and the baseline check that exposed the collapse.',
    ],
    tech: ['Python', 'PyTorch', 'SHAP', 'scikit-learn', 'pandas', 'NumPy', 'Jupyter', 'yfinance', 'Git'],
    caseStudy: '#/cs403',
    link: `${github}/Project-CS403`,
  },
  {
    title: 'This Portfolio and Its Data Checks',
    context: 'Personal project · I directed and reviewed; Claude Code wrote the code',
    summary:
      'The site you are reading, and the automated tests that keep its claims true: the CS403 tables are ' +
      'computed from the notebook’s saved outputs, and nothing deploys until every check passes.',
    points: [
      'On every push to main, CI rebuilds the per-stock CS403 metrics from the notebook at a frozen commit and stops the deploy if they differ.',
      'The same run checks the résumé PDF against its source and the site’s contact details, then opens both pages in headless Chrome.',
      'Built with Claude Code as the implementer. My part: setting the goals, choosing between proposed approaches and ' +
        'approving them, reviewing every change before it shipped, and running repeated front-end (design and accessibility) ' +
        'and back-end (correctness, security, testing) critiques, then choosing which findings to fix.',
    ],
    tech: ['React', 'Vite', 'JavaScript', 'Python', 'GitHub Actions', 'Node.js test runner', 'Headless Chrome'],
    link: `${github}/${username}.github.io`,
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
    tech: ['React', 'Vite', 'JavaScript', 'HTML/CSS', 'Node.js', 'Express', 'REST APIs', 'MongoDB'],
    // The repository is a private GitHub Classroom repo, so there is nothing public to link.
    codeNote: 'In a private course repository (GitHub Classroom), so it cannot be linked.',
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
    tech: ['Python', 'Sockets', 'TCP/IP', 'HTTP'],
    codeNote: 'Course assignment; code not published.',
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
