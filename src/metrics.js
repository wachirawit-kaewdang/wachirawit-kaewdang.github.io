// The CS403 numbers in tables and captions are computed here from metrics.json, the notebook's
// per-stock outputs. The results are frozen at source.commit, and check.mjs holds them there.
import metrics from './metrics.json' with { type: 'json' };

export const source = metrics.source;
export const sectorShap = metrics.sectorShap;

const stocks = Object.entries(metrics.stocks).map(([ticker, s]) => ({ ticker, ...s }));
export const stockCount = stocks.length;
export const sectorCount = new Set(stocks.map((s) => s.sector)).size;

const mean = (values) => values.reduce((sum, v) => sum + v, 0) / values.length;
const avg = (pick) => mean(stocks.map(pick)).toFixed(3);

// For a model that always predicts "up", accuracy is the share of up days p and F1 = 2p / (1 + p).
export const alwaysUpF1 = (p) => (2 * p) / (1 + p);

// The stocks tuned to a 0.30 threshold predicted "up" on every test day, which is why their F1
// equals the always-up value. Sorted by accuracy, highest first.
export const collapsed = stocks
  .filter((s) => s.threshold === 0.3)
  .sort((a, b) => b.lstm.acc - a.lstm.acc);
export const notCollapsed = stocks.filter((s) => s.threshold !== 0.3);

// Table 1: averages over every stock. The notebook never records ROC-AUC for the full-feature
// LSTM, so that cell is "n/r" (not recorded) and the table note says why.
const modelRows = [
  ['LSTM + self-attention', avg((s) => s.lstm.f1), 'n/r†'],
  ['Ensemble (LSTM + RF + LR, soft vote)', avg((s) => s.ensemble.f1), avg((s) => s.ensemble.auc)],
  ['Logistic Regression', avg((s) => s.lr.f1), avg((s) => s.lr.auc)],
  ['Random Forest', avg((s) => s.rf.f1), avg((s) => s.rf.auc)],
];
// The baseline comes first. Its F1 needs each stock's test-set up-day share, which only the
// collapsed stocks reveal (their accuracy is that share), so it covers those stocks and says so.
export const alwaysUpAvgF1 = mean(collapsed.map((s) => alwaysUpF1(s.lstm.acc))).toFixed(3);
export const table1Rows = [
  ['Always predict “up” (baseline)', `${alwaysUpAvgF1}‡`, '0.500'],
  ...modelRows,
];
export const ensembleAuc = avg((s) => s.ensemble.auc);
export { stocks };

// The numbers the prose quotes, rounded the way the prose says them.
export const lstmF1About = Number(modelRows[0][1]).toFixed(2);
const recordedAucs = modelRows.map((row) => Number(row[2])).filter((v) => !Number.isNaN(v));
export const aucRange = `${Math.min(...recordedAucs).toFixed(2)}–${Math.max(...recordedAucs).toFixed(2)}`;

const listed = (names) => names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;

// Bond yield's rank in each stock's LSTM SHAP ordering (1 = most important), from cell 27.
const bondTop5 = stocks.filter((s) => s.bondYieldRank <= 5);
export const bondTop5Share = `${bondTop5.length} of ${stockCount}`;
export const bondFirstFor = listed(stocks.filter((s) => s.bondYieldRank === 1).map((s) => s.ticker));

// Correlation's rank is printed for only some stocks. Where it is, the two methods do not fall on
// one side: they agree for some stocks and split, in either direction, for others.
const ordinal = (n) => `${n}${(n < 11 || n > 13) && { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'}`;
const bothRanks = stocks.filter((s) => s.bondCorrelationRank != null);
const split = 10; // ranks this far apart count as a real disagreement
export const bondAgreeFor = listed(bothRanks
  .filter((s) => Math.abs(s.bondYieldRank - s.bondCorrelationRank) < split)
  .map((s) => s.ticker));
const shapHigher = bothRanks.filter((s) => s.bondCorrelationRank - s.bondYieldRank >= split);
const corrHigher = bothRanks.filter((s) => s.bondYieldRank - s.bondCorrelationRank >= split);
export const bondShapOnly = listed(shapHigher.map((s) => `${s.ticker} (${ordinal(s.bondYieldRank)} by SHAP, ${ordinal(s.bondCorrelationRank)} by correlation)`));
export const bondCorrelationOnly = listed(corrHigher.map((s) => `${s.ticker} (${ordinal(s.bondCorrelationRank)} by correlation, ${ordinal(s.bondYieldRank)} by SHAP)`));

// Figure A.2's shared scale runs to the largest value in any panel.
export const shapPeak = sectorShap
  .flatMap(({ sector, rows }) => rows.map(([feature, value]) => ({ sector, feature, value })))
  .reduce((a, b) => (b.value > a.value ? b : a));
