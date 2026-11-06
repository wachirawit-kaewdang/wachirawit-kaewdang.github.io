"""Rebuilds src/metrics.json from the CS403 notebook's saved cell outputs, to prove the site's
numbers still match it. Nothing is re-executed: it reads the text the notebook printed.

The results are frozen at the commit recorded in metrics.json (see WORKFLOWS.txt), so running
this should change nothing.

Run:  python scripts/extract-metrics.py <path to Project-CS403 checkout> [commit]
      Needs Python 3.10+. Then: npm run check

Read from the notebook, located by the header each cell prints and by column name:
  LSTM and VIX accuracy, F1, threshold   "LSTM Acc  LSTM F1" table
  Ensemble accuracy, F1, ROC-AUC    "=== Ensemble Model Results ===" table
  Random Forest and LR metrics      per-ticker "Random Forest: Acc=... F1=... AUC=..." lines
  Bond-yield SHAP rank per stock    "=== Bond_yield SHAP Rank across all stocks ===" table
  Bond-yield correlation rank       each stock's "Top 5 Corr" list and rank-difference table;
                                    null where neither prints it (the notebook shows only those)
  Top-10 feature retrain            per-ticker "Corr top-10: ..." and "SHAP top-10: ..." lines
sectorShap and rankGap are kept from the current metrics.json: the notebook only saved them as
charts (sector_shap.png, rank_disagreement_summary.png), so those values were read off the bar
labels, and scripts/checks/metrics.mjs pins them by hash. Its bond-yield bars are
checked against the per-stock table.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / 'src' / 'metrics.json'
NOTEBOOK = 'stock_project.ipynb'


def git(repo, *args):
    done = subprocess.run(['git', '-C', str(repo), *args], capture_output=True)
    if done.returncode:
        sys.exit(f'git {" ".join(args)} failed in {repo}:\n{done.stderr.decode(errors="replace").strip()}')
    return done.stdout


def outputs(notebook):
    """Every cell's printed text, in order."""
    for cell in notebook['cells']:
        yield ''.join(''.join(o.get('text', [])) for o in cell.get('outputs', []))


def find(texts, marker):
    matches = [t for t in texts if marker in t]
    if len(matches) != 1:
        sys.exit(f'Expected one cell printing {marker!r}, found {len(matches)}')
    return matches[0]


def table(text, header_marker):
    """{ticker: {column name: value}} for the table whose header line contains header_marker.
    Columns are named by the header, so an inserted or reordered column cannot shift values."""
    lines = text.splitlines()
    try:
        at = next(i for i, line in enumerate(lines) if header_marker in line)
    except StopIteration:
        sys.exit(f'No table header containing {header_marker!r}')
    names = re.split(r'\s{2,}', lines[at].strip())
    if names[0] != 'Ticker Sector':
        sys.exit(f'Unexpected table header: {lines[at].strip()!r}')
    names = names[1:]
    rows = {}
    for line in lines[at + 1:]:
        cells = line.split()
        if not cells or set(line.strip()) <= set('-='):
            if rows:
                break
            continue
        if len(cells) != len(names) + 2:
            sys.exit(f'Row does not fit the columns {names}: {line.strip()!r}')
        rows[cells[0]] = {'Sector': cells[1], **dict(zip(names, cells[2:]))}
    return rows


def column(row, name):
    if name not in row:
        sys.exit(f'Column {name!r} not found; the table has {sorted(row)}')
    return float(row[name])


def bond_correlation_ranks(top5_text, diff_text):
    """Bond yield's correlation rank where the notebook prints it, as {ticker: rank}."""
    ranks = {}
    for ticker, listed in re.findall(r'=== Analyzing (\w+) ===.*?Top 5 Corr: \[(.*?)\]', top5_text, re.S):
        names = [name.strip(" '") for name in listed.split(',')]
        if 'Bond_yield' in names:
            ranks[ticker] = names.index('Bond_yield') + 1
    for ticker, body in re.findall(r'📊 (\w+) —(.*?)(?=📊|\Z)', diff_text, re.S):
        row = re.search(r'Bond_yield\s+(\d+)\s+\d+\s+\d+', body)
        if row:
            ranks[ticker] = int(row[1])
    return ranks


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    repo = Path(sys.argv[1])
    current = json.loads(OUT.read_text(encoding='utf-8'))
    # Resolved, so a branch name can never be recorded as the commit.
    commit = git(repo, 'rev-parse', '--short=7',
                 f'{sys.argv[2] if len(sys.argv) > 2 else current["source"]["commit"]}^{{commit}}').decode().strip()
    raw = git(repo, 'show', f'{commit}:{NOTEBOOK}')
    texts = list(outputs(json.loads(raw.decode('utf-8'))))

    lstm_text = find(texts, 'LSTM Acc  LSTM F1')
    lstm = table(lstm_text, 'LSTM Acc  LSTM F1')
    ensemble = table(find(texts, '=== Ensemble Model Results ==='), 'Soft_Acc')
    bond = table(find(texts, 'Bond_yield SHAP Rank across all stocks'), 'Bond_yield Rank')
    baselines = find(texts, 'Random Forest: Acc=')
    metric = r'Acc=([\d.]+) F1=([\d.]+) AUC=([\d.]+)'
    per_ticker = dict(re.findall(r'=== ([A-Z]+) ===\n(.*?)(?==== |\Z)', baselines, re.S))
    corr_ranks = bond_correlation_ranks(find(texts, 'Top 5 Corr:'), find(texts, 'Corr_Rank'))
    retrain = dict(re.findall(r'=== ([A-Z]+) ===\n(.*?)(?==== |\Z)', find(texts, 'Corr top-10:'), re.S))

    tickers = set(lstm)
    for name, seen in (('ensemble', ensemble), ('bond-yield', bond), ('RF/LR', per_ticker), ('retrain', retrain)):
        if set(seen) != tickers:
            sys.exit(f'The {name} table has different stocks: {sorted(set(seen) ^ tickers)}')

    stocks = {}
    for ticker, row in lstm.items():
        ens = ensemble[ticker]
        # The LSTM table reprints the ensemble's numbers, a free check that the columns line up.
        for here, there in (('Ens Acc', 'Soft_Acc'), ('Ens F1', 'Soft_F1'), ('Thresh', 'Thresh')):
            if column(row, here) != column(ens, there):
                sys.exit(f'{ticker}: {here} {row[here]} disagrees with the ensemble table\'s {there} {ens[there]}')
        rf = re.search(r'Random Forest: ' + metric, per_ticker[ticker])
        lr = re.search(r'Logistic Reg:\s+' + metric, per_ticker[ticker])
        by_corr = re.search(r'Corr top-10:\s+' + metric, retrain[ticker])
        by_shap = re.search(r'SHAP top-10:\s+' + metric, retrain[ticker])
        if not (rf and lr and by_corr and by_shap):
            sys.exit(f'{ticker}: a Random Forest, Logistic Reg or top-10 retrain line was not found')
        stocks[ticker] = {
            'sector': row['Sector'],
            'threshold': column(row, 'Thresh'),
            'lstm': {'acc': column(row, 'LSTM Acc'), 'f1': column(row, 'LSTM F1')},
            'vix': {'acc': column(row, 'VIX Acc'), 'f1': column(row, 'VIX F1')},
            'ensemble': {key: column(ens, name) for key, name in
                         (('acc', 'Soft_Acc'), ('f1', 'Soft_F1'), ('auc', 'AUC'))},
            'rf': dict(zip(('acc', 'f1', 'auc'), map(float, rf.groups()))),
            'lr': dict(zip(('acc', 'f1', 'auc'), map(float, lr.groups()))),
            'retrain': {
                'corr': dict(zip(('acc', 'f1', 'auc'), map(float, by_corr.groups()))),
                'shap': dict(zip(('acc', 'f1', 'auc'), map(float, by_shap.groups()))),
            },
            'bondYieldRank': int(column(bond[ticker], 'Bond_yield Rank')),
            'bondCorrelationRank': corr_ranks.get(ticker),
        }

    # sector_shap.png's bond-yield bar is the mean of the sector's two stocks in the table.
    for sector in current['sectorShap']:
        drawn = dict(sector['rows']).get('Bond_yield')
        values = [column(bond[t], 'SHAP Value') for t, s in stocks.items() if s['sector'] == sector['sector']]
        if drawn is not None and abs(drawn - sum(values) / len(values)) > 0.00011:
            sys.exit(f'sectorShap {sector["sector"]}: bond yield {drawn} does not match the notebook\'s {values}')

    data = {
        'source': {**current['source'], 'commit': commit},
        'stocks': stocks,
        'sectorShap': current['sectorShap'],
        'rankGap': current['rankGap'],
    }
    OUT.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n', encoding='utf-8', newline='\n')
    print(f'Wrote {OUT} from {NOTEBOOK} @ {commit}: {len(stocks)} stocks')


if __name__ == '__main__':
    main()
