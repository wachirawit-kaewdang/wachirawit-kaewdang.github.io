"""Rebuilds src/metrics.json from the CS403 notebook's saved cell outputs, so the site's numbers
can be refreshed after a rerun instead of copied by hand. Nothing is re-executed: it reads the
text the notebook printed at a pinned commit.

Run:  python scripts/extract-metrics.py <path to Project-CS403 checkout> [commit]
      (commit defaults to the one already recorded in metrics.json), then npm run check.

Read from the notebook, located by the header each cell prints:
  LSTM accuracy, F1 and threshold   "LSTM Acc  LSTM F1" table
  Ensemble accuracy, F1, ROC-AUC    "=== Ensemble Model Results ===" table
  Random Forest and LR metrics      per-ticker "Random Forest: Acc=... F1=... AUC=..." lines
  Bond-yield SHAP rank per stock    "=== Bond_yield SHAP Rank across all stocks ===" table
sectorShap is kept from the current metrics.json: the notebook only saved it as a chart
(sector_shap.png), so those values were read off the bar labels.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / 'src' / 'metrics.json'
NOTEBOOK = 'stock_project.ipynb'


def outputs(notebook):
    """Every cell's printed text, in order."""
    for cell in notebook['cells']:
        yield ''.join(''.join(o.get('text', [])) for o in cell.get('outputs', []))


def find(texts, marker):
    matches = [t for t in texts if marker in t]
    if len(matches) != 1:
        sys.exit(f'Expected one cell printing {marker!r}, found {len(matches)}')
    return matches[0]


def rows(text, header, columns):
    """Table rows after `header`: ticker, sector, then `columns` numbers."""
    body = text.split(header, 1)[1]
    pattern = re.compile(r'^([A-Z]+)\s+([A-Za-z]+)\s+' + r'\s+'.join([r'([\d.]+)'] * columns), re.M)
    return {m[1]: (m[2], [float(v) for v in m.groups()[2:]]) for m in pattern.finditer(body)}


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    repo = Path(sys.argv[1])
    current = json.loads(OUT.read_text(encoding='utf-8'))
    commit = sys.argv[2] if len(sys.argv) > 2 else current['source']['commit']
    raw = subprocess.run(['git', '-C', str(repo), 'show', f'{commit}:{NOTEBOOK}'],
                         capture_output=True, check=True).stdout
    texts = list(outputs(json.loads(raw.decode('utf-8'))))

    lstm = rows(find(texts, 'LSTM Acc  LSTM F1'), 'LSTM Acc  LSTM F1', 7)
    ensemble = rows(find(texts, '=== Ensemble Model Results ==='), 'AUC', 5)
    bond = rows(find(texts, 'Bond_yield SHAP Rank across all stocks'), 'SHAP Value', 2)
    baselines = find(texts, 'Random Forest: Acc=')
    metric = r'Acc=([\d.]+) F1=([\d.]+) AUC=([\d.]+)'
    per_ticker = {
        m[1]: m[2] for m in re.finditer(r'=== ([A-Z]+) ===\n(.*?)(?==== |\Z)', baselines, re.S)
    }

    stocks = {}
    for ticker, (sector, (thresh, acc, f1, *_)) in lstm.items():
        _, (_, _, soft_acc, soft_f1, auc) = ensemble[ticker]
        rf = re.search(r'Random Forest: ' + metric, per_ticker[ticker]).groups()
        lr = re.search(r'Logistic Reg:\s+' + metric, per_ticker[ticker]).groups()
        stocks[ticker] = {
            'sector': sector,
            'threshold': thresh,
            'lstm': {'acc': acc, 'f1': f1},
            'ensemble': {'acc': soft_acc, 'f1': soft_f1, 'auc': auc},
            'rf': dict(zip(('acc', 'f1', 'auc'), map(float, rf))),
            'lr': dict(zip(('acc', 'f1', 'auc'), map(float, lr))),
            'bondYieldRank': int(bond[ticker][1][0]),
        }

    data = {
        'source': {**current['source'], 'commit': commit[:7]},
        'stocks': stocks,
        'sectorShap': current['sectorShap'],
    }
    OUT.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n', encoding='utf-8', newline='\n')
    print(f'Wrote {OUT} from {NOTEBOOK} @ {commit[:7]}: {len(stocks)} stocks')


if __name__ == '__main__':
    main()
