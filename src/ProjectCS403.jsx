// Appendix A of the portfolio: the CS403 senior project write-up, shown at #/cs403. Set like the
// home page, with its own A-numbering: sections A.1–A.6, Table A.1 and Figures A.1–A.3.
import { ExtLink, Ref, LinkLine, NumberedTable } from './paper.jsx';
import { APPENDIX, asset } from './paper-utils.js';
import { profile, projects } from './data.js';
import {
  alwaysUpF1, bondAgreeFor, bondCorrelationOnly, bondFirstFor, bondShapOnly, bondTop5Share, collapsed, ensembleAuc,
  lstmF1About, notCollapsed, sectorCount, sectorShap,
  bondRankOf, shapPeak, stockCount, stocks,
} from './metrics.js';

const img = (name) => asset(`cs403/${name}.webp`);
// The project's code link and stack come from its entry in data.js.
const project = projects.find((p) => p.caseStudy);
const repo = project.link;

// Table A.1's rows and Figure A.2's values are computed in metrics.js from the notebook's outputs.
const pct = (v) => v.toFixed(3);
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

// Figures carry their intrinsic size so the page does not jump as they load, and alt text that
// states what the chart shows rather than repeating the caption.
function Figure({ n, name, width, height, alt, caption }) {
  return (
    <figure className="figure" id={`figure-a${n}`} tabIndex={-1}>
      {/* The link takes its name from the alt text, so a screen reader hears the finding. */}
      <ExtLink href={img(name)}>
        <img src={img(name)} width={width} height={height} alt={alt} loading="lazy" decoding="async" />
      </ExtLink>
      <figcaption>
        <span className="caplabel">Figure A.{n}.</span> {caption}{' '}
        <span className="scrollhint">Swipe sideways to see the whole chart.</span>
      </figcaption>
    </figure>
  );
}

const ARef = (props) => <Ref route={APPENDIX} {...props} />;

// Small multiples, one booktabs-style table per sector, all on one shared scale so a bar's length
// can be compared across sectors (the original chart scaled each panel to itself). Bond yield, the
// feature §A.3 is about, is set in bold ink; the sixth grid cell is the key.
const shapMax = shapPeak.value;

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

function SectorFigure() {
  return (
    <figure className="figure data-figure" id="figure-a2" tabIndex={-1}>
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
        sector. <a href={img('sector_shap')} target="_blank" rel="noreferrer">Original chart (opens in a new tab)</a>
      </figcaption>
    </figure>
  );
}

// Figure A.3, redrawn from the notebook's numbers: the tuned LSTM per stock, with the two
// reference points the argument needs. Chance on accuracy, and on F1 the always-up value, which
// is only known for the stocks that collapsed; there the tick lands on the end of the bar.
function StockFigure() {
  const panels = [
    {
      title: 'Accuracy',
      note: 'tick: chance, 0.5',
      value: (s) => s.lstm.acc,
      tick: () => 0.5,
      spoken: () => ', chance is 0.500',
    },
    {
      title: 'F1',
      note: 'tick: always “up”',
      value: (s) => s.lstm.f1,
      tick: (s) => (collapsed.includes(s) ? alwaysUpF1(s.lstm.acc) : null),
      spoken: (s) => (collapsed.includes(s)
        ? `, always “up” gives ${alwaysUpF1(s.lstm.acc).toFixed(3)}`
        : ', always “up” value not known'),
    },
  ];
  return (
    <figure className="figure data-figure" id="figure-a3" tabIndex={-1}>
      <div className="multiples pair">
        {panels.map(({ title, note, value, tick, spoken }) => (
          <table key={title} className="bars tickers">
            <caption>
              {title} <span>({note})</span>
            </caption>
            <colgroup><col className="labels" /><col /></colgroup>
            <thead className="visually-hidden">
              <tr><th scope="col">Stock</th><th scope="col">{title}</th></tr>
            </thead>
            <tbody>
              {stocks.map((s) => (
                <tr key={s.ticker}>
                  <th scope="row">{s.ticker}</th>
                  <td>
                    <Bar share={value(s)} tick={tick(s)} label={value(s).toFixed(3)} spoken={spoken(s)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ))}
      </div>
      <figcaption>
        <span className="caplabel">Figure A.3.</span> Test-set accuracy and F1 of the tuned LSTM per
        stock, on a 0–1 scale. Accuracy stays close to chance even where F1 looks high, and on the{' '}
        {collapsed.length} stocks with an F1 tick the bar ends exactly on it.{' '}
        <a href={img('final_summary')} target="_blank" rel="noreferrer">Original chart, with the ensemble and VIX runs (opens in a new tab)</a>
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
        <Contacts className="contactline" />
      </header>

      <section className="abstract" aria-label="Abstract">
        <p>
          <strong>Abstract.</strong> Can SHAP tell us something about a stock-prediction model that
          plain correlation can’t? We trained an LSTM with self-attention on {stockCount} US stocks, explained
          it with SHAP, and compared those explanations with Pearson correlation. The two disagreed by
          5 to 12 rank positions on average, about what two unrelated rankings would show, so we can’t
          say SHAP explains the model better. The model also failed a naive baseline on{' '}
          {collapsed.length} of the {stockCount} stocks: it predicted “up” every day, so its F1 tied
          always predicting “up” (<ARef to="table-a1">Table A.1</ARef>).
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
          target over the training period, and by mean |SHAP| on the trained LSTM. The two rankings disagreed by roughly 5 to 12
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
        <Figure
          n={1}
          name="rank_disagreement_summary"
          width={1600}
          height={791}
          alt="Heatmap of the rank difference between correlation and SHAP for each feature and stock, with a bar chart of the average difference per feature. Rankings differ by roughly 5 to 12 positions on average, most for volume change, EMA26 and volume/MA ratio."
          caption="Rank difference between correlation and SHAP for each feature and stock."
        />
      </section>

      <section className="section">
        <Heading n={3} />
        <p>
          Bond yield was in the model’s SHAP top 5 for {bondTop5Share} stocks, where about 2 would land
          by chance, and was the #1 feature for {bondFirstFor}. That fits financial intuition for JPM,
          since bank profits depend on interest rates, but not everywhere: GS, the other bank, ranks it{' '}
          {bondRankOf('GS')}. Correlation only sometimes agrees. Where the notebook
          prints both ranks, the two methods put it close together for {bondAgreeFor}, but they split
          for {bondShapOnly}, and the other way for {bondCorrelationOnly}.
          Grouped by sector, the patterns differ too (<ARef to="figure-a2">Figure A.2</ARef>). Energy
          leans on the S&amp;P 500 trend, while Healthcare and Technology lean on MACD.
        </p>
        <SectorFigure />
      </section>

      <section className="section">
        <Heading n={4} />
        <p>
          Our tuned model reported an average F1 of about {lstmF1About}, which looked good. Set against
          the simplest possible baseline, a model that always predicts “up”, the numbers
          matched (<ARef to="table-a1">Table A.1</ARef>). With the decision threshold tuned down to 0.30,
          the model predicted “up” on every test day for {collapsed.length} of the {stockCount} stocks.
          The notebook doesn’t print daily predictions, so that is inferred: on those stocks its accuracy
          and F1 fit the always-up formula. The comparison isn’t in the notebook either; this
          site’s <ExtLink href={`${profile.source}/blob/main/scripts/check.mjs`}>build check</ExtLink> recomputes
          it from the notebook’s outputs.
        </p>
        <NumberedTable
          number="A.1"
          caption={`The ${collapsed.length} stocks tuned to a 0.30 threshold, where the model predicted “up” on every test day. Its accuracy is then the share of up days p, so its F1 must equal an always-up model’s, 2p / (1 + p), and it does on every row.`}
          note={`${thresholds} used other thresholds and did not collapse to always-up, so the identity does not apply to them. Accuracy and F1 are the notebook’s test-set outputs.`}
          columns={['Stock', 'Accuracy', 'Our F1', 'F1 of “always up”']}
          rows={collapsed.map((s) => [s.ticker, pct(s.lstm.acc), pct(s.lstm.f1), pct(alwaysUpF1(s.lstm.acc))])}
        />
        <p>
          Threshold-free metrics tell the same story: the ensemble’s ROC-AUC averaged {ensembleAuc} across the{' '}
          {stockCount} stocks, only a little better than random (0.5). Predicting 3-day direction from technical
          indicators alone is close to a coin flip (<ARef to="figure-a3">Figure A.3</ARef>). That is the
          result, not a failure of the explainability work: SHAP still gives a rough view of what the
          model relied on.
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
          methodology and the VIX market-sentiment component. We ran the SHAP analysis together.
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
