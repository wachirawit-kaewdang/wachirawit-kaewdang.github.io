// The frozen CS403 results: metrics.json has the right shape, what the extractor can't rebuild is
// pinned, what metrics.js computes is unchanged, and the always-up claims still hold.
import metrics from '../../src/metrics.json' with { type: 'json' };
import {
  alwaysUpF1, aucRange, bondAgreeFor, bondCorrelationOnly, bondRankRows, bondShapOnly, collapsed, ensembleAuc, lstmF1About,
  notCollapsed, rankGapRange, retrainAuc, retrainCorrWins, table1Rows, vixRevealed,
} from '../../src/metrics.js';
import { sha256 } from './shared.mjs';

export const failures = [];

// The notebook has no random seeds and downloads live prices, so a rerun would change every
// number. The results stay at this commit.
const frozenAt = '0c4ef04';

// metrics.json is rebuilt by scripts/extract-metrics.py; a parsing slip should fail here, not
// render as NaN. Rates sit in [0, 1], thresholds in (0, 1), ranks among the 27 features.
const rate = (v) => typeof v === 'number' && v >= 0 && v <= 1;
const rank = (v) => Number.isInteger(v) && v >= 1 && v <= 27;
const shape = [];
if (metrics.source?.commit !== frozenAt) {
  shape.push(`source commit is ${metrics.source?.commit}, but the results are frozen at ${frozenAt}. Moving it means ` +
    'redoing the charts, sectorShap and typed claims first (see WORKFLOWS.txt), then changing frozenAt in scripts/checks/metrics.mjs');
}
const stockEntries = Object.entries(metrics.stocks ?? {});
// Typed prose, the charts and "2 per sector" all assume this many stocks and sectors.
if (stockEntries.length !== 10) shape.push(`${stockEntries.length} stocks, expected 10`);
for (const [ticker, s] of stockEntries) {
  const bad = [
    typeof s.sector !== 'string' && 'sector',
    !(rate(s.threshold) && s.threshold > 0 && s.threshold < 1) && 'threshold',
    !rank(s.bondYieldRank) && 'bondYieldRank',
    !(s.bondCorrelationRank === null || rank(s.bondCorrelationRank)) && 'bondCorrelationRank',
    ...['acc', 'f1'].filter((k) => !rate(s.lstm?.[k])).map((k) => `lstm.${k}`),
    ...['acc', 'f1'].filter((k) => !rate(s.vix?.[k])).map((k) => `vix.${k}`),
    ...['ensemble', 'rf', 'lr'].flatMap((m) => ['acc', 'f1', 'auc'].filter((k) => !rate(s[m]?.[k])).map((k) => `${m}.${k}`)),
    ...['corr', 'shap'].flatMap((m) => ['acc', 'f1', 'auc'].filter((k) => !rate(s.retrain?.[m]?.[k])).map((k) => `retrain.${m}.${k}`)),
  ].filter(Boolean);
  if (bad.length) shape.push(`${ticker}: ${bad.join(', ')}`);
}
const sectors = metrics.sectorShap ?? [];
if (sectors.length !== 5) shape.push(`${sectors.length} sectors in sectorShap, expected 5`);
for (const { sector, stocks, rows } of sectors) {
  if (rows?.length !== 10 || !rows.every(([f, v]) => typeof f === 'string' && rate(v) && v > 0)) {
    shape.push(`sectorShap ${sector}: expected 10 [feature, value] rows`);
  }
  // Figure A.2 prints these tickers beside each sector's bars.
  const tickers = stockEntries.filter(([, s]) => s.sector === sector).map(([ticker]) => ticker);
  if (!tickers.length) shape.push(`sectorShap ${sector}: no stock has this sector`);
  if (stocks?.split(', ').sort().join() !== tickers.sort().join()) {
    shape.push(`sectorShap ${sector}: lists ${stocks}, but its stocks are ${tickers.join(', ')}`);
  }
}
for (const s of shape) failures.push(`metrics.json: ${s}`);

// The extractor proves the per-stock numbers. These cover what it can't: sectorShap and the source
// block, which it copies rather than rebuilds, and the calculations in metrics.js. The results are
// frozen, so any change here is a mistake unless the freeze itself is being moved.
const pinned = '5cf5882e5d841c6217bb378a365222734322934253612a6ea3bbecc7b8218058';
const copied = sha256(JSON.stringify({ source: metrics.source, sectorShap: metrics.sectorShap, rankGap: metrics.rankGap }));
if (copied !== pinned) failures.push(`metrics.json: sectorShap, rankGap or source changed; their hash is now ${copied}`);
if (metrics.rankGap?.length !== 27) failures.push('metrics.json: rankGap should have all 27 features');
const computed = {
  table1Rows,
  aucRange,
  ensembleAuc,
  retrainAuc,
  retrainCorrWins,
  collapsed: collapsed.map((s) => s.ticker),
  vixRevealed: vixRevealed.map((s) => s.ticker),
  lstmF1About,
  bondAgreeFor,
  bondShapOnly,
  bondCorrelationOnly,
  bondRankRows,
  rankGapRange,
};
const expectedOutputs = {
  "table1Rows": [
    [
      "Always predict “up” (baseline), 7 stocks",
      "0.707",
      "0.500"
    ],
    [
      "LSTM, same 7 stocks",
      "0.707",
      "not recorded"
    ],
    [
      "LSTM + self-attention",
      "0.710",
      "not recorded"
    ],
    [
      "Ensemble (LSTM + RF + LR, soft vote)",
      "0.663",
      "0.568"
    ],
    [
      "Logistic Regression",
      "0.525",
      "0.555"
    ],
    [
      "Random Forest",
      "0.374",
      "0.546"
    ]
  ],
  "aucRange": "0.55–0.57",
  "ensembleAuc": "0.568",
  "retrainAuc": {
    "corr": "0.543",
    "shap": "0.499"
  },
  "retrainCorrWins": 6,
  "collapsed": [
    "JPM",
    "UNH",
    "GS",
    "XOM",
    "CVX",
    "TSLA",
    "AMZN"
  ],
  "vixRevealed": [
    "JNJ",
    "COST"
  ],
  "lstmF1About": "0.71",
  "bondAgreeFor": "JPM",
  "bondShapOnly": "TSLA (2nd by SHAP, 15th by correlation) and COST (2nd by SHAP, 18th by correlation)",
  "bondCorrelationOnly": "XOM (2nd by correlation, 22nd by SHAP)",
  "bondRankRows": [
    [
      "JPM",
      "1st",
      "2nd"
    ],
    [
      "AMZN",
      "1st",
      "not printed"
    ],
    [
      "TSLA",
      "2nd",
      "15th"
    ],
    [
      "COST",
      "2nd",
      "18th"
    ],
    [
      "NVDA",
      "3rd",
      "not printed"
    ],
    [
      "JNJ",
      "5th",
      "not printed"
    ],
    [
      "UNH",
      "12th",
      "not printed"
    ],
    [
      "GS",
      "16th",
      "not printed"
    ],
    [
      "CVX",
      "19th",
      "not printed"
    ],
    [
      "XOM",
      "22nd",
      "2nd"
    ]
  ],
  "rankGapRange": "5 to 12"
};
if (JSON.stringify(computed) !== JSON.stringify(expectedOutputs)) {
  failures.push(`src/metrics.js: computed results changed: ${JSON.stringify(computed)}`);
}

// Appendix A claims the 0.30-threshold stocks collapsed to always-up, so their F1 must equal
// 2p / (1 + p) for accuracy p. If a rerun of the notebook breaks that, the claim must change too.
for (const s of collapsed) {
  // The identity alone proves no down day was called correctly. A second model landing on the same
  // accuracy is the supporting evidence that these stocks really did collapse to "up".
  if (s.lstm.acc !== s.vix.acc) failures.push(`metrics.json: ${s.ticker}'s LSTM and VIX accuracy differ`);
  if (Math.abs(s.lstm.f1 - alwaysUpF1(s.lstm.acc)) > 0.0006) {
    failures.push(`metrics.json: ${s.ticker} F1 ${s.lstm.f1} is not the always-up value for accuracy ${s.lstm.acc}`);
  }
}
// And the other way: Table A.2's note says the remaining stocks did not collapse, so their F1
// must not match it.
for (const s of notCollapsed) {
  if (Math.abs(s.lstm.f1 - alwaysUpF1(s.lstm.acc)) <= 0.0006) {
    failures.push(`metrics.json: ${s.ticker} F1 equals always-up, but Appendix A says it did not collapse`);
  }
}

export const summary = [
  `metrics.json has the expected shape (${stockEntries.length} stocks, ${sectors.length} sectors)`,
  `always-up identity holds for ${collapsed.length} stocks and fails for ${notCollapsed.length}`,
];
