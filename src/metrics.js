// Everything the site says about the CS403 results is computed here from metrics.json, the
// notebook's per-stock outputs, so a table or a caption cannot drift from the source numbers.
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
export const table1Rows = [
  ['LSTM + self-attention', avg((s) => s.lstm.f1), 'n/r†'],
  ['Ensemble (LSTM + RF + LR, soft vote)', avg((s) => s.ensemble.f1), avg((s) => s.ensemble.auc)],
  ['Logistic Regression', avg((s) => s.lr.f1), avg((s) => s.lr.auc)],
  ['Random Forest', avg((s) => s.rf.f1), avg((s) => s.rf.auc)],
];
export const ensembleAuc = avg((s) => s.ensemble.auc);

// The numbers the prose quotes, rounded the way the prose says them.
const lstmF1 = table1Rows[0][1];
export const lstmF1About = Number(lstmF1).toFixed(2);
const recordedAucs = table1Rows.map((row) => Number(row[2])).filter((v) => !Number.isNaN(v));
export const aucRange = `${Math.min(...recordedAucs).toFixed(2)}–${Math.max(...recordedAucs).toFixed(2)}`;

const listed = (names) => names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;

// Bond yield's rank in each stock's LSTM SHAP ordering (1 = most important), from cell 27.
const bondTop5 = stocks.filter((s) => s.bondYieldRank <= 5);
export const bondTop5Share = `${bondTop5.length} of ${stockCount}`;
export const bondFirstFor = listed(stocks.filter((s) => s.bondYieldRank === 1).map((s) => s.ticker));

// Figure A.2's shared scale runs to the largest value in any panel.
export const shapPeak = sectorShap
  .flatMap(({ sector, rows }) => rows.map(([feature, value]) => ({ sector, feature, value })))
  .reduce((a, b) => (b.value > a.value ? b : a));
