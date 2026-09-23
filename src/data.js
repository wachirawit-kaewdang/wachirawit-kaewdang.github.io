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
    title: 'Stock Price Direction Prediction with Explainable AI',
    context: 'Senior project (CS403) · 2-person team',
    featured: true,
    summary:
      'An LSTM with self-attention that predicts 3-day price direction for 10 US stocks across ' +
      '5 sectors — and a SHAP analysis that checks whether the model reasons the way a financial ' +
      'analyst would.',
    metrics: [
      { value: '0.710', label: 'Average F1' },
      { value: '0.754', label: 'Best F1 (JPM)' },
      { value: '27', label: 'Engineered features' },
      { value: '10', label: 'Stocks · 5 sectors' },
    ],
    points: [
      'LSTM + self-attention (3 layers, hidden 128) trained with Focal Loss for class imbalance.',
      'Benchmarked against Random Forest and Logistic Regression; an LSTM + RF + LR majority-vote ensemble became the final model.',
      'SHAP (KernelExplainer) attribution compared with Pearson correlation, including rank-disagreement and sector-level analysis.',
      'Fundamental data (P/E, EPS) was tested and deliberately excluded: quarterly values fill-forwarded into a daily series added noise, not signal.',
      'My part: data collection and preparation, and the training approach and model architecture.',
    ],
    tech: ['Python', 'PyTorch', 'SHAP', 'scikit-learn', 'pandas', 'NumPy'],
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
    tech: ['React', 'Vite', 'JavaScript', 'Node.js', 'Express', 'REST'],
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
  degree: 'BSc Computer Science — Software Engineering track',
  period: '2022 – May 2026',
};

export const languages = [
  { name: 'Thai', level: 'Native' },
  { name: 'English', level: 'Professional working proficiency' },
];
