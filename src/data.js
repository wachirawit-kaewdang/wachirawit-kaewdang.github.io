// All site content lives here, so updating the portfolio never means touching layout code.

export const profile = {
  name: 'Wachirawit Kaewdang',
  nickname: 'Ohm',
  role: 'Machine Learning & Software Engineer',
  location: 'Bangkok, Thailand',
  email: 'wachirawit.kaewdang@gmail.com',
  github: 'https://github.com/wachirawit-kaewdang',
  linkedin: 'https://www.linkedin.com/in/wachirawit-kaewdang',
  resume: 'Wachirawit_Kaewdang_Resume.pdf',
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
      'An LSTM with self-attention that predicts 3-day price direction for 10 US stocks across ' +
      '5 sectors, used to test whether SHAP explains a model better than plain correlation, ' +
      'and checked against a naive baseline.',
    // Stated as the abstract's main result, ahead of any metric.
    finding:
      'my senior-project model ties a naive “always predict up” baseline, and the case study ' +
      'shows how I caught it',
    // Averages over the 10 stocks, recomputed from the per-stock outputs in stock_project.ipynb.
    results: {
      // The caption leads with what the numbers mean, so the F1 column is never read alone.
      caption:
        'Every model is close to chance. F1 looks strong, but on 7 of 10 stocks the tuned LSTM ' +
        'predicts “up” on every test day, so its 0.710 equals an always-up baseline. ROC-AUC, ' +
        'which ignores the threshold, is 0.55–0.57 for every model (0.5 is chance).',
      note:
        'Averages over the 10 stocks; test set is the last 20% of Jan 2020 – Apr 2025, split by ' +
        'date. † From the project README; every other value is recomputed from the notebook.',
      columns: ['Model', 'F1', 'ROC-AUC'],
      rows: [
        // The dagger points to the table note: this value is from the README, not the notebook.
        ['LSTM + self-attention', '0.710', '≈0.57†'],
        ['Ensemble (LSTM + RF + LR, soft vote)', '0.663', '0.568'],
        ['Logistic Regression', '0.525', '0.555'],
        ['Random Forest', '0.374', '0.546'],
      ],
    },
    points: [
      'LSTM + self-attention (3 layers, hidden 128) with Focal Loss, compared with Random Forest, Logistic Regression and a soft-voting ensemble.',
      'SHAP and Pearson correlation ranked features very differently, by roughly 5 to 12 positions per feature on average.',
      'SHAP surfaced bond yield as a key driver: top 5 for 6 of 10 stocks and #1 for JPM and AMZN, while correlation ranked it low.',
      'Baseline check: the tuned model matched an “always predict up” baseline. The case study shows how I caught it and what I would change.',
      'My part: data collection and preparation, and the training approach and model architecture.',
    ],
    tech: ['Python', 'PyTorch', 'SHAP', 'scikit-learn', 'pandas', 'NumPy', 'Jupyter'],
    caseStudy: '#/cs403',
    link: 'https://github.com/wachirawit-kaewdang/Project-CS403',
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
