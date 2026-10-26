// Appendix A of the portfolio: the CS403 senior project write-up, shown at #/cs403. Set like the
// home page, with its own A-numbering: sections A.1–A.6, Table A.1 and Figures A.1–A.3.
import { Ref, LinkLine, NumberedTable } from './paper.jsx';
import { APPENDIX, asset } from './paper-utils.js';
import { profile } from './data.js';

const img = (name) => asset(`cs403/${name}.webp`);
const repo = 'https://github.com/wachirawit-kaewdang/Project-CS403';

// The 7 stocks whose tuned threshold was 0.30. On each, the model predicted "up" on every test
// day, so its accuracy is the share of up days p and its F1 equals an always-up model's,
// 2p / (1 + p). Values are the notebook's 4-decimal outputs. NVDA (0.50), JNJ and COST (0.35)
// used other thresholds, so the identity does not apply to them.
const baselineRows = [
  { stock: 'JPM', acc: 0.6082, f1: 0.7563 },
  { stock: 'UNH', acc: 0.6, f1: 0.75 },
  { stock: 'GS', acc: 0.5673, f1: 0.724 },
  { stock: 'XOM', acc: 0.5347, f1: 0.6968 },
  { stock: 'CVX', acc: 0.5265, f1: 0.6898 },
  { stock: 'TSLA', acc: 0.502, f1: 0.6685 },
  { stock: 'AMZN', acc: 0.4939, f1: 0.6612 },
];
const alwaysUpF1 = (p) => ((2 * p) / (1 + p)).toFixed(3);

const sections = [
  'Setup',
  'SHAP and correlation disagree a lot',
  'Bond yield matters to the model, but correlation misses it',
  'Checking the results honestly',
  'What I’d do differently',
  'My part',
];
const sectionId = (n) => `appendix-a${n}`;

function Heading({ n }) {
  return (
    <h2 id={sectionId(n)} tabIndex={-1}>
      <span className="num">A.{n}</span>
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

function Contacts({ className }) {
  return (
    <LinkLine className={className}>
      <a className="primary" href={repo} target="_blank" rel="noreferrer">Code on GitHub</a>
      <a href={asset(profile.resume)} target="_blank" rel="noreferrer">Résumé (PDF)</a>
      <a href={`mailto:${profile.email}`}>Email</a>
    </LinkLine>
  );
}

export default function ProjectCS403() {
  return (
    <main id="main" className="page case" tabIndex={-1}>
      <p className="back"><a href="#project-1">← Back to §1.1</a></p>

      <header className="titleblock">
        <h1 id="appendix-title" tabIndex={-1}>
          <span className="num">Appendix A</span>
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
          honestly whether the model beat a naive baseline (<ARef to="table-a1">Table A.1</ARef>).
        </p>
      </section>

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
        <Figure
          n={2}
          name="sector_shap"
          width={1600}
          height={396}
          alt="Five bar charts, one per sector, of average SHAP importance by feature. Energy leans on the S&P 500 trend, while Healthcare and Technology lean on MACD."
          caption="Average SHAP importance by sector."
        />
      </section>

      <section className="section">
        <Heading n={4} />
        <p>
          Our tuned model reported an average F1 of about 0.71, which looked good. When I checked it
          against the simplest possible baseline, a model that always predicts “up”, the numbers
          matched (<ARef to="table-a1">Table A.1</ARef>). With the decision threshold tuned down to 0.30,
          the model was predicting “up” for almost every day in a rising market.
        </p>
        <NumberedTable
          number="A.1"
          caption="The 7 stocks tuned to a 0.30 threshold, where the model predicted “up” on every test day. Its accuracy is then the share of up days p, so its F1 must equal an always-up model’s, 2p / (1 + p), and it does on every row."
          note="NVDA (threshold 0.50), JNJ and COST (0.35) did not collapse to always-up, so the identity does not apply to them. Accuracy and F1 are the notebook’s test-set outputs."
          columns={['Stock', 'Accuracy', 'Our F1', 'F1 of “always up”']}
          rows={baselineRows.map((r) => [r.stock, r.acc.toFixed(3), r.f1.toFixed(3), alwaysUpF1(r.acc)])}
        />
        <p>
          Threshold-free metrics tell the same story: ROC-AUC averaged about 0.57 across the 10 stocks,
          only a little better than random (0.5). Predicting 3-day direction from technical
          indicators alone is close to a coin flip (<ARef to="figure-a3">Figure A.3</ARef>). That’s an
          honest result, not a failure of the explainability work: SHAP still shows what the model
          relied on.
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
          <em>Stack.</em> {['Python', 'PyTorch', 'SHAP', 'scikit-learn', 'pandas', 'NumPy', 'Jupyter', 'yfinance'].join(' · ')}
        </p>
      </section>

      <footer className="closing">
        <p>Questions about the method or the data? The code and notebook are on GitHub.</p>
        <Contacts className="contactline left" />
        <p className="back"><a href="#project-1">← Back to §1.1</a></p>
      </footer>
    </main>
  );
}
