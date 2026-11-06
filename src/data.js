// All site content lives here, so updating the portfolio never means touching layout code.
// The CS403 numbers come from metrics.js, which computes them from the notebook's outputs.
import {
  aucRange, bondAgreeFor, bondTop5Share, collapsed, lstmF1About, notebookUrl, rankGapRange, sectorCount, source,
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
    'Computer Science graduate (Software Engineering track, May 2026) from Thammasat University. ' +
    'I work across machine learning for time series — with a focus on model explainability ' +
    'rather than accuracy alone — and full-stack web development in React and Node.js.',
  status: 'Open to Machine Learning Engineer and Software Engineer roles in Bangkok or remote.',
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
    // Stated as the abstract's main result, ahead of any metric.
    finding: [
      `We checked our senior-project model against a naive “always predict up” baseline and found its ${lstmF1About} F1 wasn’t skill: on ${collapsedShare} stocks it only matched always predicting “up”. `,
      appendix('A.4', 'appendix-a4'),
      ' shows the evidence',
    ],
    results: {
      // The caption leads with what the numbers mean, so the F1 column is never read alone.
      caption: [
        `Every model with a recorded ROC-AUC is close to chance, at ${aucRange} where 0.50 is chance, and the tuned ` +
          `LSTM’s high F1 comes from predicting “up” on every test day for ${collapsedShare} stocks (`,
        tableA2,
        ').',
      ],
      note: [
        `Averages over the ${stockCount} stocks, except rows marked ‡; test set is the last 20% of Jan 2020 – Apr 2025, split by ` +
          'date. The LSTM and ensemble thresholds were tuned on that test set, so those figures are if anything optimistic; ' +
          'Random Forest and Logistic Regression use the default 0.5, so their F1 isn’t directly comparable. ' +
          'Computed from the notebook’s per-stock outputs (',
        { label: `Project-CS403 @ ${source.commit}`, href: notebookUrl },
        '). † Not recorded for the full-feature LSTM. ' +
          `‡ Over the ${collapsed.length} stocks where the tuned LSTM collapsed, which reveals the test-set up-day share; its F1 equals the baseline on each.`,
      ],
      columns: ['Model', 'F1', 'ROC-AUC'],
      rows: table1Rows,
    },
    // The details (SHAP findings, the baseline check, what I'd change) live in Appendix A; here
    // only what a reader needs before choosing to go there.
    points: [
      'LSTM + self-attention (3 layers, hidden 128) with Focal Loss, compared with Random Forest, Logistic Regression and a soft-voting ensemble.',
      [
        `SHAP and Pearson correlation ranked features ${rankGapRange} positions apart on average, about what ` +
          'unrelated rankings would give (≈9), and retraining on each method’s top features did not favour SHAP. SHAP put ' +
          `bond yield in the top 5 for ${bondTop5Share} stocks; correlation agreed for ${bondAgreeFor} ` +
          'but split on the others where both ranks are printed; see ',
        appendix('A.3', 'appendix-a3'),
        '.',
      ],
      'My part: data collection and preparation, the training approach and model architecture, and the SHAP analysis together with my teammate.',
    ],
    tech: ['Python', 'PyTorch', 'SHAP', 'scikit-learn', 'pandas', 'NumPy', 'Jupyter', 'yfinance', 'Git'],
    caseStudy: '#/cs403',
    link: `${github}/Project-CS403`,
  },
  {
    title: 'This Portfolio and Its Data Checks',
    context: 'Personal project · built with Claude Code',
    summary:
      'The site you are reading: React + Vite, with the CS403 tables computed from the notebook’s ' +
      'saved outputs instead of typed by hand.',
    points: [
      'On every push to main, CI rebuilds the per-stock CS403 metrics from the notebook at a frozen commit and stops the deploy if they differ.',
      'The same run checks the résumé PDF against its source and the site’s contact details, then opens both pages in headless Chrome.',
    ],
    tech: ['React', 'Vite', 'JavaScript', 'Python', 'GitHub Actions'],
    link: `${github}/${username}.github.io`,
  },
  {
    title: 'Recipe Web Application',
    context: 'CS369 · 5-person team',
    summary:
      'A full-stack recipe app: a React + Vite frontend with client-side routing, backed by a ' +
      'Node.js / Express REST API.',
    points: [
      'My part: the MyRecipe management feature, recipe deletion, and wiring the frontend to the backend API.',
    ],
    tech: ['React', 'Vite', 'JavaScript', 'HTML/CSS', 'Node.js', 'Express', 'REST APIs'],
    // The repository is a private GitHub Classroom repo, so there is nothing public to link.
    codeNote: 'In a private course repository (GitHub Classroom), so it cannot be linked.',
  },
  {
    title: 'HTTP Web Server from Scratch',
    context: 'CS322 Computer Networks · solo',
    summary:
      'An HTTP/1.0 server written directly on Python sockets — no frameworks — serving an ' +
      'HTML page and a GIF with the right content-type headers, and returning 404 for anything else.',
    points: [],
    tech: ['Python', 'Sockets', 'TCP/IP', 'HTTP'],
    codeNote: 'Course assignment; code not published.',
  },
];

export const skills = [
  { group: 'Languages', items: ['Python', 'JavaScript', 'Java', 'C', 'C++', 'SQL'] },
  { group: 'ML & Data', items: ['PyTorch', 'scikit-learn', 'SHAP', 'pandas', 'NumPy', 'Jupyter'] },
  { group: 'Web', items: ['React', 'Vite', 'Node.js', 'Express', 'Django', 'REST APIs', 'HTML/CSS'] },
  { group: 'Data & Tools', items: ['MySQL', 'MongoDB', 'Git', 'Docker', 'Testing (TDD)'] },
];

export const education = {
  school: 'Thammasat University',
  degree: 'BSc Computer Science (Computer and Information Science major) — Software Engineering track',
  period: '2022 – May 2026',
};

export const languages = [
  { name: 'Thai', level: 'Native' },
  { name: 'English', level: 'Professional working proficiency' },
];
