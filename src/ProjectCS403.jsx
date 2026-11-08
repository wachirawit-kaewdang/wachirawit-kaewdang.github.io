// Appendix A of the portfolio: the CS403 senior project write-up, shown at #/cs403. Set like the
// home page, with its own A-numbering: sections A.1–A.6, Tables A.1–A.2 and Figures A.1–A.3.
import { useEffect, useRef } from 'react';
import { ExtLink, Ref, LinkLine, NumberedTable } from './paper.jsx';
import { APPENDIX, asset } from './paper-utils.js';
import { profile, projects } from './data.js';
import {
  alwaysUpF1, bondAgreeFor, bondFirstFor, bondTop5Share, collapsed, ensembleAuc,
  lstmF1About, notCollapsed, sectorCount, sectorShap,
  bondOppositeFor, bondRankOf, bondRankRows, bondSplitFor, notebookUrl, rankGap, rankGapRange, retrainAuc, retrainCorrWins, shapPeak, stockCount, stocks, upShare, vixRevealed,
} from './metrics.js';

const img = (name) => asset(`cs403/${name}.webp`);
// The project's code link and stack come from its entry in data.js.
const project = projects.find((p) => p.caseStudy);
const repo = project.link;

// The tables' rows and Figure A.2's values are computed in metrics.js from the notebook's outputs.
const pct = (v) => v.toFixed(3);
// The VIX run collapsed where the LSTM didn't, which shows how the LSTM did against always-up there.
const vixNote = `The VIX run collapsed on ${vixRevealed.map((s) => s.ticker).join(' and ')}, which reveals their always-up F1: ${vixRevealed
  .map((s) => `${s.ticker} ${pct(alwaysUpF1(upShare(s)))} against the LSTM’s ${pct(s.lstm.f1)}`).join(', ')}.`;
const thresholds = notCollapsed.map((s) => `${s.ticker} (${s.threshold.toFixed(2)})`).join(', ');
const featureLabel = (name) => name.replace(/_/g, ' ');

const sections = [
  'Setup',
  'SHAP and correlation disagree, but that proves little',
  'Bond yield matters to the model, and correlation only sometimes shows it',
  'Checking the results against a baseline',
  'What I’d do differently',
  'My part',
];
const sectionId = (n) => `appendix-a${n}`;

function Heading({ n }) {
  return (
    <h2 id={sectionId(n)} tabIndex={-1}>
      <span className="num">A.{n}</span>{' '}
      {sections[n - 1]}
    </h2>
  );
}

const ARef = (props) => <Ref route={APPENDIX} {...props} />;

// Small multiples, one booktabs-style table per sector, all on one shared scale so a bar's length
// can be compared across sectors (the original chart scaled each panel to itself). Bond yield, the
// feature §A.3 is about, is set in bold ink; the sixth grid cell is the key.
const shapMax = shapPeak.value;

// The site's one piece of decorative motion: a figure's bars grow to their value the first time
// they scroll into view, so on the collapsed stocks a bar visibly stops on its tick. Bars are full
// by default and only hidden here, just before being shown, so print and reduced motion get complete
// figures. A figure the reader jumped to is already there when they land: focus settles it at once.
const drawn = new Set();

function useDrawIn() {
  const figure = useRef(null);
  useEffect(() => {
    const element = figure.current;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches
      || !('IntersectionObserver' in window)
      || drawn.has(element.id)
      || window.location.hash.endsWith(`/${element.id}`)) return undefined;

    const panels = [...element.querySelectorAll('.bars')]
      .filter((panel) => panel.getBoundingClientRect().top > window.innerHeight * 0.85);
    const observer = new IntersectionObserver((entries) => {
      for (const { isIntersecting, target } of entries) {
        if (!isIntersecting) continue;
        drawn.add(element.id);
        target.classList.replace('waiting', 'drawing');
        observer.unobserve(target);
      }
    }, { rootMargin: '0px 0px -15% 0px' });
    const settle = () => {
      drawn.add(element.id);
      observer.disconnect();
      panels.forEach((panel) => panel.classList.remove('waiting'));
    };
    panels.forEach((panel) => {
      panel.classList.add('waiting');
      observer.observe(panel);
    });
    element.addEventListener('focusin', settle);
    return () => {
      observer.disconnect();
      element.removeEventListener('focusin', settle);
      panels.forEach((panel) => panel.classList.remove('waiting'));
    };
  }, []);
  return figure;
}

function Bar({ share, tick, label, spoken }) {
  return (
    <div className="bar">
      <span className="track" aria-hidden="true">
        <span className="fill" style={{ width: `${share * 100}%` }} />
        {tick != null && <span className="tick" style={{ left: `${tick * 100}%` }} />}
      </span>
      <span className="val">{label}</span>
      {spoken && <span className="visually-hidden">{spoken}</span>}
    </div>
  );
}

// Figure A.1, redrawn from the printed bar labels of the notebook's chart: the average gap per
// feature, with the 9 that unrelated rankings give as the reference. Bars share one 0–12 scale.
const gapScale = 12;
const unrelatedGap = 9;
const gapPanels = [
  { title: 'Largest gaps', rows: rankGap.slice(0, 14) },
  { title: 'Smallest gaps', rows: rankGap.slice(14) },
];

function GapFigure() {
  const figure = useDrawIn();
  return (
    <figure ref={figure} className="figure data-figure" id="figure-a1" tabIndex={-1}>
      <div className="multiples pair">
        {gapPanels.map(({ title, rows }) => (
          <table key={title} className="bars">
            <caption>{title} <span>(tick: unrelated rankings, 9)</span></caption>
            <colgroup><col className="labels" /><col /></colgroup>
            <thead className="visually-hidden">
              <tr><th scope="col">Feature</th><th scope="col">Average rank gap</th></tr>
            </thead>
            <tbody>
              {rows.map(([feature, value]) => (
                <tr key={feature} className={feature === 'Bond_yield' ? 'mark' : undefined}>
                  <th scope="row">{featureLabel(feature)}</th>
                  <td>
                    <Bar
                      share={value / gapScale}
                      tick={unrelatedGap / gapScale}
                      label={value.toFixed(1)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ))}
      </div>
      <figcaption>
        <span className="caplabel">Figure A.1.</span> Average gap between each feature’s correlation
        and SHAP ranks over the {stockCount} stocks. The averages run from {rankGapRange}, around the 9 that
        unrelated rankings give. Bond yield is in <strong>bold</strong>.{' '}
        <a href={img('rank_disagreement_summary')} target="_blank" rel="noreferrer">Original chart, with the per-stock heatmap<span className="newtab"> (opens in a new tab)</span></a>
      </figcaption>
    </figure>
  );
}

function SectorFigure() {
  const figure = useDrawIn();
  return (
    <figure ref={figure} className="figure data-figure" id="figure-a2" tabIndex={-1}>
      <div className="multiples">
        <p className="key">
          All bars share one scale, from 0 to {shapMax.toFixed(4)} ({shapPeak.sector}’s{' '}
          {featureLabel(shapPeak.feature)}). Bond yield is in <strong>bold</strong>.
        </p>
        {sectorShap.map(({ sector, stocks: tickers, rows }) => {
          return (
            <table key={sector} className="bars">
              <caption>
                {sector} <span>({tickers})</span>
              </caption>
              <colgroup><col className="labels" /><col /></colgroup>
              <thead className="visually-hidden">
                <tr><th scope="col">Feature</th><th scope="col">Mean |SHAP|</th></tr>
              </thead>
              <tbody>
                {rows.map(([feature, value]) => (
                  <tr key={feature} className={feature === 'Bond_yield' ? 'mark' : undefined}>
                    <th scope="row">{featureLabel(feature)}</th>
                    <td>
                      <Bar share={value / shapMax} label={value.toFixed(4)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          );
        })}
      </div>
      <figcaption>
        <span className="caplabel">Figure A.2.</span> Mean |SHAP| of the top 10 features in each
        sector. <a href={img('sector_shap')} target="_blank" rel="noreferrer">Original chart<span className="newtab"> (opens in a new tab)</span></a>
      </figcaption>
    </figure>
  );
}

// Figure A.3: how far the tuned LSTM lands from what always predicting "up" would score, per stock.
// On a 0–1 scale a tie and a near miss look the same, so the figure draws only the gap: a bar right
// of the centre line is better than always-up, left is worse, and none means an exact tie. That
// reference is known wherever the LSTM or the VIX run collapsed, so for 9 of the 10 stocks.
const gapRange = 0.06;
const tieWithin = 0.0006;
const signed = (gap) => (Math.abs(gap) < tieWithin ? '0.000' : `${gap > 0 ? '+' : '−'}${Math.abs(gap).toFixed(3)}`);

function Offset({ gap }) {
  if (gap === null) return <div className="bar"><span className="track centred" aria-hidden="true" /><span className="val">not known</span></div>;
  const tie = Math.abs(gap) < tieWithin;
  const share = Math.min(Math.abs(gap), gapRange) / gapRange / 2;
  return (
    <div className="bar">
      <span className="track centred" aria-hidden="true">
        <span className="zero" />
        {!tie && (
          <span
            className="fill"
            style={{ left: `${gap > 0 ? 50 : 50 - share * 100}%`, width: `${share * 100}%`, transformOrigin: gap > 0 ? 'left' : 'right' }}
          />
        )}
      </span>
      <span className="val">{signed(gap)}</span>
      <span className="visually-hidden">{tie ? ', a tie with always “up”' : gap > 0 ? ', better than always “up”' : ', worse than always “up”'}</span>
    </div>
  );
}

function StockFigure() {
  const panels = [
    { title: 'Accuracy', gap: (s) => (upShare(s) === null ? null : s.lstm.acc - upShare(s)) },
    { title: 'F1', gap: (s) => (upShare(s) === null ? null : s.lstm.f1 - alwaysUpF1(upShare(s))) },
  ];
  const figure = useDrawIn();
  return (
    <figure ref={figure} className="figure data-figure" id="figure-a3" tabIndex={-1}>
      <div className="multiples pair">
        {panels.map(({ title, gap }) => (
          <table key={title} className="bars tickers">
            <caption>
              {title} <span>(LSTM minus always “up”)</span>
            </caption>
            <colgroup><col className="labels" /><col /></colgroup>
            <thead className="visually-hidden">
              <tr><th scope="col">Stock</th><th scope="col">{title}, LSTM minus always “up”</th></tr>
            </thead>
            <tbody>
              {stocks.map((s) => (
                <tr key={s.ticker}>
                  <th scope="row">{s.ticker}</th>
                  <td><Offset gap={gap(s)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ))}
      </div>
      <figcaption>
        <span className="caplabel">Figure A.3.</span> How far the tuned LSTM lands from always predicting
        “up”, per stock, on a scale of ±{gapRange.toFixed(2)}. Right of the centre line is better, left is
        worse, and no bar is an exact tie, as on the {collapsed.length} stocks that collapsed. JNJ beat
        always “up” on both, COST tied on accuracy and fell short on F1, and NVDA’s reference isn’t known.{' '}
        <a href={img('final_summary')} target="_blank" rel="noreferrer">Original chart, with the ensemble and VIX runs<span className="newtab"> (opens in a new tab)</span></a>
      </figcaption>
    </figure>
  );
}

function Contacts({ className, lead = 'code' }) {
  const code = <ExtLink className={lead === 'code' ? 'primary' : undefined} href={repo}>Code on GitHub</ExtLink>;
  const email = <a className={lead === 'email' ? 'primary' : undefined} href={`mailto:${profile.email}`}>Email</a>;
  return (
    <LinkLine className={className}>
      {lead === 'email' ? email : code}
      {lead === 'email' ? code : email}
      <ExtLink href={asset(profile.resume)}>Résumé (PDF)</ExtLink>
    </LinkLine>
  );
}

export default function ProjectCS403() {
  return (
    <main id="main" className="page case" tabIndex={-1}>
      {/* The running head's "← Portfolio" is the way back at the top; the closing has another. */}
      <header className="titleblock">
        <h1 id="appendix-title" tabIndex={-1}>
          <span className="num">Appendix A</span>{' '}
          Stock Direction Prediction with Explainable AI
        </h1>
        <p className="authorline">
          <span className="role">{profile.name} and Tumrong Saechoen</span>
          <span>Senior project (CS403)</span> <span>Thammasat University</span>
        </p>
      </header>

      <section className="abstract" aria-label="Abstract">
        <p>
          <strong>Abstract.</strong> Can SHAP tell us something about a stock-prediction model that
          plain correlation can’t? We trained an LSTM with self-attention on {stockCount} US stocks, explained
          it with SHAP, and compared those explanations with Pearson correlation. The two disagreed by{' '}
          {rankGapRange} rank positions on average, about what two unrelated rankings would show, and
          retraining on each method’s top features did not favour SHAP, so we can’t say it explains the
          model better. Set against a naive baseline, the model tied on {collapsed.length} of the{' '}
          {stockCount} stocks: it predicted “up” every day, so its F1 matched always predicting “up”
          (<ARef to="table-a2">Table A.2</ARef>).
        </p>
      </section>

      <nav className="contents" id="appendix-contents" tabIndex={-1} aria-labelledby="contents-title">
        <p id="contents-title"><strong>Contents</strong></p>
        <ol>
          {sections.map((title, i) => (
            <li key={title}>
              <ARef to={sectionId(i + 1)}>
                <span className="num">A.{i + 1}</span>{' '}
                {title}
              </ARef>
            </li>
          ))}
        </ol>
      </nav>

      <section className="section">
        <Heading n={1} />
        <dl className="facts">
          <div><dt>Data</dt><dd>{stockCount} US stocks, {stockCount / sectorCount} per sector (Tech, Healthcare, Energy, Finance, Consumer), Jan 2020 – Apr 2025</dd></div>
          <div><dt>Features</dt><dd>27 daily features: returns, volatility, moving averages, RSI/MACD/Stochastic, volume/OBV, S&amp;P 500 context, bond yield</dd></div>
          <div><dt>Target</dt><dd>Direction of the 3-day forward return (up / down), 80/20 time-ordered split</dd></div>
          <div><dt>Model</dt><dd>LSTM (3 layers, hidden 128) + self-attention over a 60-day window, Focal Loss with class weights</dd></div>
          <div><dt>Compared with</dt><dd>Random Forest, Logistic Regression, a soft-voting ensemble, and a version with VIX (market fear) features</dd></div>
        </dl>
      </section>

      <section className="section">
        <Heading n={2} />
        <p>
          For every stock we ranked the 27 features twice: by absolute Pearson correlation with the
          target over the training period, and by mean |SHAP| on the trained LSTM. The two rankings disagreed by roughly {rankGapRange}{' '}
          positions per feature on average (<ARef to="figure-a1">Figure A.1</ARef>). Volume change, EMA26
          and Volume/MA ratio moved the most.
        </p>
        <p>
          That gap alone proves little. Two unrelated rankings of 27 features differ by about 9 positions
          on average, and over {stockCount} stocks their per-feature averages also span about 5 to 13. So
          this work does not show that SHAP explains the model better than correlation, only that they
          measure different things: correlation sees straight-line links with the target, while SHAP
          estimates what drives the model’s output. That estimate is rough. It covers the first 30 test
          days at 100 samples each, and each day’s features were repeated across the 60-day window, a
          sequence the model never saw in training.
        </p>
        <p>
          The notebook also put this to a direct test, retraining the LSTM on each method’s top 10
          features for each stock. Correlation’s features averaged ROC-AUC {retrainAuc.corr} and SHAP’s{' '}
          {retrainAuc.shap}, and correlation scored higher on {retrainCorrWins} of the {stockCount} stocks.
          Both are close to chance, and this was one unseeded run with a shorter 20-day window, so it
          shows only that SHAP’s picks were no better here.
        </p>
        <GapFigure />
      </section>

      <section className="section">
        <Heading n={3} />
        <p>
          Bond yield was in the model’s SHAP top 5 for {bondTop5Share} stocks, where about 2 would land
          by chance, and was the #1 feature for {bondFirstFor}. That fits financial intuition for JPM,
          since bank profits depend on interest rates, but not everywhere: GS, the other bank, ranks it{' '}
          {bondRankOf('GS')}. Correlation only sometimes agrees: where both ranks are printed, the two
          are close for {bondAgreeFor}, far apart for {bondSplitFor}, and reversed for {bondOppositeFor}{' '}
          (<ARef to="table-a1">Table A.1</ARef>).
        </p>
        <NumberedTable
          number="A.1"
          caption="Bond yield’s rank among the 27 features for each stock, by SHAP and by correlation, strongest SHAP rank first."
          note="The notebook prints a correlation rank only where bond yield is in a stock’s top 5 by correlation or among its largest rank gaps."
          columns={['Stock', 'SHAP rank', 'Correlation rank']}
          rows={bondRankRows}
        />
        <p>
          Grouped by sector, the patterns differ too (<ARef to="figure-a2">Figure A.2</ARef>). Energy
          leans on the S&amp;P 500 trend, while Healthcare and Technology lean on MACD.
        </p>
        <SectorFigure />
        <p className="aside">
          If you open the notebook, note that its closing summary cell says top 5 for 8 of 10 stocks, #1
          for both banks, and that SHAP gives richer insight than correlation. Those lines are typed text,
          and the notebook’s own printed tables don’t support them. The numbers here come from those
          tables, and Figures A.1 and A.2 from the values printed on its charts.
        </p>
      </section>

      <section className="section">
        <Heading n={4} />
        <p>
          Our tuned model reported an average F1 of about {lstmF1About}, which looked good. When I checked it
          against the simplest possible baseline, a model that always predicts “up”, the numbers
          matched (<ARef to="table-a2">Table A.2</ARef>). With the decision threshold tuned down to 0.30,
          the model predicted “up” on every test day for {collapsed.length} of the {stockCount} stocks.
          The notebook doesn’t print daily predictions, so that is inferred: on those stocks its accuracy
          and F1 fit the always-up formula. The comparison isn’t in the{' '}
          <ExtLink href={notebookUrl}>notebook</ExtLink> either; this
          site’s <ExtLink href={`${profile.source}/blob/main/scripts/checks/metrics.mjs`}>build check</ExtLink> recomputes
          it from the notebook’s outputs.
        </p>
        <NumberedTable
          number="A.2"
          caption={`The ${collapsed.length} stocks tuned to a 0.30 threshold, where the model predicted “up” on every test day. Its accuracy is then the share of up days p, so its F1 must equal an always-up model’s, 2p / (1 + p), and it does on every row.`}
          note={`${thresholds} used other thresholds and did not collapse to always-up, so the identity does not apply to them. ${vixNote} Accuracy and F1 are the notebook’s test-set outputs.`}
          columns={['Stock', 'Accuracy', 'Our F1', 'Always-up F1']}
          rows={collapsed.map((s) => [s.ticker, pct(s.lstm.acc), pct(s.lstm.f1), pct(alwaysUpF1(s.lstm.acc))])}
        />
        <p>
          Threshold-free metrics tell the same story: the ensemble’s ROC-AUC averaged {ensembleAuc} across the{' '}
          {stockCount} stocks, only a little better than random (0.5). Predicting 3-day direction from these
          features is close to a coin flip, and on the {collapsed.length} stocks that collapsed neither score
          shows any skill (<ARef to="figure-a3">Figure A.3</ARef>). SHAP still gives a rough view of what
          the model relied on, within the limits in A.2.
        </p>
        <StockFigure />
      </section>

      <section className="section">
        <Heading n={5} />
        <ul>
          <li>Always report a naive baseline (“always up”, majority class) next to every metric.</li>
          <li>Tune the decision threshold and early stopping on a separate validation set, not the test set.</li>
          <li>Fit the feature scaler on the training data only, to avoid leaking test-period statistics.</li>
          <li>Use walk-forward validation across several time windows instead of one 80/20 split.</li>
          <li>Lead with threshold-free metrics such as ROC-AUC for noisy targets like short-term returns.</li>
        </ul>
      </section>

      <section className="section">
        <Heading n={6} />
        <p>
          I collected and prepared the training data, and designed the training
          approach and model architecture. My teammate Tumrong Saechoen designed the analysis
          methodology and the VIX market-sentiment component. We ran the SHAP analysis together, and I did the baseline check in A.4.
        </p>
        <p className="meta">
          <em>Stack.</em> {project.tech.join(' · ')}
        </p>
      </section>

      <footer className="closing">
        <p>Want to talk through the method or the data? Email is quickest; the code and notebook are on GitHub.</p>
        <Contacts className="contactline left" lead="email" />
        <p className="back"><a href="#project-1">← Back to the portfolio (§1.1)</a></p>
      </footer>
    </main>
  );
}
