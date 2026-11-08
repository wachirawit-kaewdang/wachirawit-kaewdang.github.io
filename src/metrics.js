// The CS403 numbers in tables and captions are computed here from metrics.json, the notebook's
// per-stock outputs. The results are frozen at source.commit, and check.mjs holds them there.
import metrics from './metrics.json' with { type: 'json' };

export const source = metrics.source;
export const notebookUrl = `${source.repo}/blob/${source.commit}/${source.notebook}`;
export const sectorShap = metrics.sectorShap;
export const rankGap = metrics.rankGap;
export const rankGapRange = `${Math.round(rankGap.at(-1)[1])} to ${Math.round(rankGap[0][1])}`;

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
// LSTM, so that cell says so.
const modelRows = [
  ['LSTM + self-attention', avg((s) => s.lstm.f1), 'not recorded'],
  ['Ensemble (LSTM + RF + LR, soft vote)', avg((s) => s.ensemble.f1), avg((s) => s.ensemble.auc)],
  ['Logistic Regression', avg((s) => s.lr.f1), avg((s) => s.lr.auc)],
  ['Random Forest', avg((s) => s.rf.f1), avg((s) => s.rf.auc)],
];
// The baseline comes first. Its F1 needs each stock's test-set up-day share, and Table 1 uses the
// stocks where the tuned LSTM itself collapsed (its accuracy is that share), and says so.
export const alwaysUpAvgF1 = mean(collapsed.map((s) => alwaysUpF1(s.lstm.acc))).toFixed(3);
// The LSTM over those same stocks sits beside it: 0.707 against 0.710 would otherwise read as a
// small win, when the 0.710 only differs because it averages all the stocks.
const lstmSameStocksF1 = mean(collapsed.map((s) => s.lstm.f1)).toFixed(3);
export const table1Rows = [
  [`Always predict “up” (baseline), ${collapsed.length} stocks`, alwaysUpAvgF1, '0.500'],
  [`LSTM, same ${collapsed.length} stocks`, lstmSameStocksF1, 'not recorded'],
  ...modelRows,
];
export const ensembleAuc = avg((s) => s.ensemble.auc);

// The VIX run collapsed on two stocks the LSTM didn't, so their up-day share is known too.
const fitsAlwaysUp = ({ acc, f1 }) => Math.abs(f1 - alwaysUpF1(acc)) <= 0.0006;
export const upShare = (s) => {
  if (collapsed.includes(s)) return s.lstm.acc;
  return fitsAlwaysUp(s.vix) ? s.vix.acc : null;
};
export const vixRevealed = notCollapsed.filter((s) => upShare(s) !== null);

// The notebook's direct test: the LSTM retrained on each method's top 10 features (cell 9).
export const retrainAuc = { corr: avg((s) => s.retrain.corr.auc), shap: avg((s) => s.retrain.shap.auc) };
export const retrainCorrWins = stocks.filter((s) => s.retrain.corr.auc > s.retrain.shap.auc).length;
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
export const bondRankOf = (ticker) => ordinal(stocks.find((s) => s.ticker === ticker).bondYieldRank);
export const bondCorrelationRankOf = (ticker) => ordinal(stocks.find((s) => s.ticker === ticker).bondCorrelationRank);
const bothRanks = stocks.filter((s) => s.bondCorrelationRank != null);
const split = 10; // ranks this far apart count as a real disagreement
export const bondAgreeFor = listed(bothRanks
  .filter((s) => Math.abs(s.bondYieldRank - s.bondCorrelationRank) < split)
  .map((s) => s.ticker));
const shapHigher = bothRanks.filter((s) => s.bondCorrelationRank - s.bondYieldRank >= split);
const corrHigher = bothRanks.filter((s) => s.bondYieldRank - s.bondCorrelationRank >= split);
export const bondShapOnly = listed(shapHigher.map((s) => `${s.ticker} (${ordinal(s.bondYieldRank)} by SHAP, ${ordinal(s.bondCorrelationRank)} by correlation)`));
export const bondSplitFor = listed(shapHigher.map((s) => s.ticker));
export const bondOppositeFor = listed(corrHigher.map((s) => s.ticker));
// Table A.1: every stock, strongest SHAP rank first. Correlation's rank is printed for only some.
export const bondRankRows = [...stocks]
  .sort((a, b) => a.bondYieldRank - b.bondYieldRank)
  .map((s) => [s.ticker, ordinal(s.bondYieldRank), s.bondCorrelationRank ? ordinal(s.bondCorrelationRank) : 'not printed']);
export const bondCorrelationOnly = listed(corrHigher.map((s) => `${s.ticker} (${ordinal(s.bondCorrelationRank)} by correlation, ${ordinal(s.bondYieldRank)} by SHAP)`));

// Figure A.2's shared scale runs to the largest value in any panel.
export const shapPeak = sectorShap
  .flatMap(({ sector, rows }) => rows.map(([feature, value]) => ({ sector, feature, value })))
  .reduce((a, b) => (b.value > a.value ? b : a));
