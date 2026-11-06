"""Tests for the parsing in extract-metrics.py, on small made-up notebook outputs.
Run: python scripts/test_extract_metrics.py"""
import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('extract_metrics', Path(__file__).with_name('extract-metrics.py'))
extract = importlib.util.module_from_spec(spec)
spec.loader.exec_module(extract)

TABLE = """Ticker Sector  Thresh  LSTM Acc  LSTM F1
NVDA   Technology  0.50  0.5469  0.6942
JPM    Finance     0.30  0.6082  0.7563
"""


class Table(unittest.TestCase):
    def test_reads_columns_by_name(self):
        rows = extract.table(TABLE, 'LSTM Acc  LSTM F1')
        self.assertEqual(rows['JPM']['Sector'], 'Finance')
        self.assertEqual(extract.column(rows['JPM'], 'LSTM F1'), 0.7563)

    def test_an_inserted_column_cannot_shift_values(self):
        text = """Ticker Sector  Extra  Thresh  LSTM Acc  LSTM F1
JPM    Finance  9.9  0.30  0.6082  0.7563
"""
        rows = extract.table(text, 'LSTM Acc  LSTM F1')
        self.assertEqual(extract.column(rows['JPM'], 'Thresh'), 0.30)

    def test_a_row_with_a_stray_cell_is_refused(self):
        with self.assertRaises(SystemExit):
            extract.table(TABLE.replace('0.7563', '0.7563 oops'), 'LSTM Acc  LSTM F1')

    def test_a_missing_header_is_refused(self):
        with self.assertRaises(SystemExit):
            extract.table(TABLE, 'No such header')

    def test_a_missing_column_is_refused(self):
        with self.assertRaises(SystemExit):
            extract.column({'Sector': 'Finance'}, 'LSTM F1')


class Find(unittest.TestCase):
    def test_needs_exactly_one_match(self):
        self.assertEqual(extract.find(['a marker', 'other'], 'marker'), 'a marker')
        with self.assertRaises(SystemExit):
            extract.find(['marker', 'marker again'], 'marker')
        with self.assertRaises(SystemExit):
            extract.find(['other'], 'marker')


class BondRanks(unittest.TestCase):
    def test_reads_both_places_the_notebook_prints_it(self):
        top5 = "=== Analyzing JPM ===\n  Top 5 Corr: ['RSI', 'Bond_yield', 'MACD']\n"
        diff = '📊 TSLA — x\nFeature  Corr_Rank  SHAP_Rank  Rank_Diff\nBond_yield  15  2  13\n'
        self.assertEqual(extract.bond_correlation_ranks(top5, diff), {'JPM': 2, 'TSLA': 15})

    def test_a_stock_that_prints_neither_has_no_rank(self):
        top5 = "=== Analyzing GS ===\n  Top 5 Corr: ['RSI', 'MACD']\n"
        self.assertEqual(extract.bond_correlation_ranks(top5, ''), {})


if __name__ == '__main__':
    unittest.main()
