// Tests for the calculations in src/metrics.js. Run: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  alwaysUpF1, bondCorrelationRankOf, bondRankOf, collapsed, notCollapsed, rankGap, rankGapRange, retrainCorrWins,
  stockCount, table1Rows,
} from '../src/metrics.js';
import { projects } from '../src/data.js';

test('alwaysUpF1 is 2p / (1 + p)', () => {
  assert.equal(alwaysUpF1(0), 0);
  assert.equal(alwaysUpF1(1), 1);
  assert.ok(Math.abs(alwaysUpF1(0.5) - 2 / 3) < 1e-12);
});

test('every stock is either collapsed or not, and collapsed stocks sort by accuracy', () => {
  assert.equal(collapsed.length + notCollapsed.length, stockCount);
  const accuracies = collapsed.map((s) => s.lstm.acc);
  assert.deepEqual(accuracies, [...accuracies].sort((a, b) => b - a));
});

test('ranks read as ordinals, including the teens', () => {
  assert.equal(bondRankOf('JPM'), '1st');
  assert.equal(bondRankOf('TSLA'), '2nd');
  assert.equal(bondRankOf('UNH'), '12th');
  assert.equal(bondRankOf('XOM'), '22nd');
  assert.equal(bondCorrelationRankOf('COST'), '18th');
});

test('Table 1 leads with the baseline, then the LSTM on the same stocks', () => {
  assert.match(table1Rows[0][0], /baseline/);
  assert.doesNotMatch(table1Rows.flat().join(' '), /[†‡]/);
  // Row 2 is the same LSTM as row 3, on fewer stocks; the row groups say which stocks each covers.
  assert.equal(table1Rows[1][0], table1Rows[2][0]);
  assert.equal(table1Rows[0][1], table1Rows[1][1]);
  const { groups } = projects.find((p) => p.results).results;
  assert.deepEqual(groups.map(({ at }) => at), [0, 2]);
  assert.match(groups[0].label, new RegExp(`${collapsed.length} stocks`));
});

test('the rank gaps run from largest to smallest', () => {
  const values = rankGap.map(([, value]) => value);
  assert.deepEqual(values, [...values].sort((a, b) => b - a));
  assert.equal(rankGapRange, '5 to 12');
});

test('the retrain win count stays within the stock count', () => {
  assert.ok(retrainCorrWins >= 0 && retrainCorrWins <= stockCount);
});
