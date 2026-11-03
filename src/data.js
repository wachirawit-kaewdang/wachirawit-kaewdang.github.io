// All site content lives here, so updating the portfolio never means touching layout code.
// The CS403 numbers come from metrics.js, which computes them from the notebook's outputs.
import {
  aucRange, bondTop5Share, collapsed, ensembleAuc, sectorCount, source, stockCount, table1Rows,
} from './metrics.js';

const collapsedShare = `${collapsed.length} of ${stockCount}`;

// Prose that points into Appendix A is written as a list of pieces: strings, and refs that the
// page renders as cross-references, e.g. ['see ', appendix('A.2', 'appendix-a2')].
const appendix = (label, to) => ({ label: `Appendix ${label}`, to });
const tableA1 = { label: 'Table A.1', to: 'table-a1' };

// Every GitHub and site URL is built from the username, so a rename is a one-line change.
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
    'Computer Science graduate (Software Engineering track) from Thammasat University. ' +
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
      `${sectorCount} sectors, used to test whether SHAP explains a model better than plain correlation, ` +
      'and checked against a naive baseline.',
    // Stated as the abstract's main result, ahead of any metric.
    finding: [
      `my senior-project model ties a naive “always predict up” baseline on ${collapsedShare} stocks, and `,
      appendix('A.4', 'appendix-a4'),
      ' shows how I caught it',
    ],
    results: {
      // The caption leads with what the numbers mean, so the F1 column is never read alone.
      caption: [
        `Every model is close to chance: ROC-AUC, which ignores the threshold, is ${aucRange} ` +
          'wherever it was recorded (0.5 is chance). F1 looks strong only because the tuned LSTM ' +
          `predicts “up” on every test day for ${collapsedShare} stocks, so there it equals an ` +
          'always-up baseline’s F1 (',
        tableA1,
        ').',
      ],
      note:
        `Averages over the ${stockCount} stocks; test set is the last 20% of Jan 2020 – Apr 2025, split by ` +
        `date. Computed from the notebook’s per-stock outputs (Project-CS403 @ ${source.commit}). ` +
        '† The notebook does not record ROC-AUC for the full-feature LSTM; the project README’s ' +
        `“≈0.57” matches the ensemble’s ${ensembleAuc}.`,
      columns: ['Model', 'F1', 'ROC-AUC'],
      rows: table1Rows,
    },
    // The details (SHAP findings, the baseline check, what I'd change) live in Appendix A; here
    // only what a reader needs before choosing to go there.
    points: [
      'LSTM + self-attention (3 layers, hidden 128) with Focal Loss, compared with Random Forest, Logistic Regression and a soft-voting ensemble.',
      [
        'SHAP and Pearson correlation ranked features 5 to 12 positions apart on average, and SHAP ' +
          `surfaced bond yield (top 5 for ${bondTop5Share} stocks) where correlation ranked it low; see `,
        appendix('A.2', 'appendix-a2'),
        '.',
      ],
      'My part: data collection and preparation, and the training approach and model architecture.',
    ],
    tech: ['Python', 'PyTorch', 'SHAP', 'scikit-learn', 'pandas', 'NumPy', 'Jupyter', 'yfinance'],
    caseStudy: '#/cs403',
    link: `${github}/Project-CS403`,
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
    tech: ['React', 'Vite', 'JavaScript', 'Node.js', 'Express', 'REST APIs'],
    // The repository is a private GitHub Classroom repo, so there is nothing public to link.
    codeNote: 'In a private course repository (GitHub Classroom), so it cannot be linked.',
  },
  {
    title: 'HTTP Web Server from Scratch',
    context: 'CS322 Computer Networks · solo',
    summary:
      'An HTTP/1.0 server written directly on Python sockets — no frameworks — serving static ' +
      'HTML and images with correct status codes and content-type headers.',
    points: [],
    tech: ['Python', 'Sockets', 'TCP/IP', 'HTTP'],
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
