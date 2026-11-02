// Appendix A of the portfolio: the CS403 senior project write-up, shown at #/cs403. Set like the
// home page, with its own A-numbering: sections A.1–A.6, Table A.1 and Figures A.1–A.3.
import { ExtLink, Ref, LinkLine, NumberedTable } from './paper.jsx';
import { APPENDIX, asset } from './paper-utils.js';
import { profile, projects } from './data.js';
import { alwaysUpF1, collapsed, ensembleAuc, notCollapsed, sectorShap, stockCount } from './metrics.js';

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
  'SHAP and correlation disagree a lot',
  'Bond yield matters to the model, but correlation misses it',
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
      <a href={img(name)} target="_blank" rel="noreferrer" aria-label={`Open Figure A.${n} full size (opens in a new tab)`}>
        <img src={img(name)} width={width} height={height} alt={alt} loading="lazy" decoding="async" />
      </a>
      <figcaption>
        <span className="caplabel">Figure A.{n}.</span> {caption}
      </figcaption>
    </figure>
  );
}

const ARef = (props) => <Ref route={APPENDIX} {...props} />;

// Small multiples, one booktabs-style table per sector. Bars are scaled within each panel, as in
// the original chart; the printed value carries the comparison across sectors. Bond yield, the
// feature §A.3 is about, is the one bar in the accent colour.
function SectorFigure() {
  return (
    <figure className="figure data-figure" id="figure-a2" tabIndex={-1}>
      <div className="multiples">
        {sectorShap.map(({ sector, stocks, rows }) => {
          const max = rows[0][1];
          return (
            <table key={sector} className="bars">
              <caption>
                {sector} <span>({stocks})</span>
              </caption>
              <thead className="visually-hidden">
                <tr><th scope="col">Feature</th><th scope="col">Mean |SHAP|</th></tr>
              </thead>
              <tbody>
                {rows.map(([feature, value]) => (
                  <tr key={feature} className={feature === 'Bond_yield' ? 'mark' : undefined}>
                    <th scope="row">{featureLabel(feature)}</th>
                    <td>
                      <span className="track" aria-hidden="true">
                        <span className="fill" style={{ width: `${(value / max) * 100}%` }} />
                      </span>
                      <span className="val">{value.toFixed(4)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          );
        })}
      </div>
      <figcaption>
        <span className="caplabel">Figure A.2.</span> Mean |SHAP| of the top 10 features in each sector,
        bond yield highlighted. Bars are scaled within each sector, so compare the printed values across
        panels. <a href={img('sector_shap')} target="_blank" rel="noreferrer">Original chart (opens in a new tab)</a>
      </figcaption>
    </figure>
  );
}

function Contacts({ className }) {
  return (
    <LinkLine className={className}>
      <ExtLink className="primary" href={repo}>Code on GitHub</ExtLink>
      <ExtLink href={asset(profile.resume)}>Résumé (PDF)</ExtLink>
      <a href={`mailto:${profile.email}`}>Email</a>
    </LinkLine>
  );
}

export default function ProjectCS403() {
  return (
    <main id="main" className="page case" tabIndex={-1}>
      <p className="back"><a href="#project-1">← Back to the portfolio (§1.1)</a></p>

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
          plain correlation can’t? We trained an LSTM with self-attention on 10 US stocks, explained
          it with SHAP, and compared those explanations with Pearson correlation. We also checked
          whether the model beat a naive baseline (<ARef to="table-a1">Table A.1</ARef>).
        </p>
      </section>

      <nav className="contents" aria-label="Appendix A contents">
        <p>
          <strong>Contents.</strong>{' '}
          {sections.map((title, i) => (
            <span key={title} className="linkitem">
              <ARef to={sectionId(i + 1)}>A.{i + 1} {title}</ARef>
              {i < sections.length - 1 && <span className="sep" aria-hidden="true">·</span>}
            </span>
          ))}
        </p>
      </nav>

      <section className="section">
        <Heading n={1} />
        <dl className="facts">
          <div><dt>Data</dt><dd>10 US stocks, 2 per sector (Tech, Healthcare, Energy, Finance, Consumer), Jan 2020 – Apr 2025</dd></div>
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
          target, and by mean |SHAP| on the trained LSTM. The two rankings disagreed by roughly 5 to 12
          positions per feature on average (<ARef to="figure-a1">Figure A.1</ARef>). Volume change, EMA26
          and Volume/MA ratio moved the most. Correlation only sees straight-line relationships with
          the target. SHAP shows what the model actually uses, including non-linear effects.
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
          Bond yield was in the model’s SHAP top 5 for 6 of the 10 stocks, and was the #1 feature for
          JPM and AMZN, even though correlation ranked it low for most of them. That fits financial
          intuition: bank profits depend on interest rates, and growth stocks are sensitive to them.
          Grouped by sector, the patterns differ too (<ARef to="figure-a2">Figure A.2</ARef>). Energy
          leans on the S&amp;P 500 trend, while Healthcare and Technology lean on MACD.
        </p>
        <SectorFigure />
      </section>

      <section className="section">
        <Heading n={4} />
        <p>
          Our tuned model reported an average F1 of about 0.71, which looked good. When I checked it
          against the simplest possible baseline, a model that always predicts “up”, the numbers
          matched (<ARef to="table-a1">Table A.1</ARef>). With the decision threshold tuned down to 0.30,
          the model predicted “up” on every test day for {collapsed.length} of the {stockCount} stocks, in a rising market.
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
          result, not a failure of the explainability work: SHAP still shows what the model relied on.
        </p>
        <Figure
          n={3}
          name="final_summary"
          width={1600}
          height={476}
          alt="Bar charts of accuracy and F1 for each of the 10 stocks. Accuracy stays between about 0.5 and 0.6, while F1 sits near 0.66 to 0.76."
          caption="Accuracy and F1 per stock. Accuracy stays close to 0.5–0.6 even where F1 looks high."
        />
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
          methodology and the VIX market-sentiment component.
        </p>
        <p className="meta">
          <em>Stack.</em> {project.tech.join(' · ')}
        </p>
      </section>

      <footer className="closing">
        <p>Questions about the method or the data? The code and notebook are on GitHub.</p>
        <Contacts className="contactline left" />
        <p className="back"><a href="#project-1">← Back to the portfolio (§1.1)</a></p>
      </footer>
    </main>
  );
}
