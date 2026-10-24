// Case study page for the CS403 senior project, shown at #/cs403. Set like the home page:
// numbered sections, a booktabs table and numbered figures the text refers to.
import { Ref, LinkLine, NumberedTable } from './paper.jsx';
import { asset } from './paper-utils.js';

const img = (name) => asset(`cs403/${name}.webp`);

// Tuned-threshold results next to what "always predict up" would score.
// For an always-up model, accuracy = share of up days and F1 = 2p / (1 + p).
const baselineRows = [
  { stock: 'JPM', acc: 0.608, f1: 0.756 },
  { stock: 'UNH', acc: 0.600, f1: 0.750 },
  { stock: 'GS', acc: 0.567, f1: 0.724 },
  { stock: 'XOM', acc: 0.535, f1: 0.697 },
  { stock: 'AMZN', acc: 0.494, f1: 0.661 },
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

function Heading({ n }) {
  return (
    <h2>
      <span className="num">{n}</span>
      {sections[n - 1]}
    </h2>
  );
}

function Figure({ n, name, caption }) {
  return (
    <figure className="figure" id={`figure-${n}`} tabIndex={-1}>
      <a href={img(name)} target="_blank" rel="noreferrer">
        <img src={img(name)} alt={caption} loading="lazy" />
      </a>
      <figcaption>
        <span className="caplabel">Figure {n}.</span> {caption}
      </figcaption>
    </figure>
  );
}

export default function ProjectCS403() {
  return (
    <main id="main" className="page case" tabIndex={-1}>
      <p className="back"><a href="#projects">← Back to portfolio</a></p>

      <header className="titleblock">
        <h1>Stock Direction Prediction with Explainable AI</h1>
        <p className="authorline">
          <span className="role">Senior project (CS403)</span>
          <span>Thammasat University</span> <span>2-person team</span>
        </p>
        <LinkLine className="contactline">
          <a className="primary" href="https://github.com/wachirawit-kaewdang/Project-CS403" target="_blank" rel="noreferrer">
            Code on GitHub
          </a>
        </LinkLine>
      </header>

      <section className="abstract" aria-label="Abstract">
        <p>
          <strong>Abstract.</strong> Can SHAP tell us something about a stock-prediction model that
          plain correlation can’t? We trained an LSTM with self-attention on 10 US stocks, explained
          it with SHAP, and compared those explanations with Pearson correlation. We also checked
          honestly whether the model beat a naive baseline (<Ref to="table-2">Table 2</Ref>).
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
          positions per feature on average (<Ref to="figure-1">Figure 1</Ref>). Volume change, EMA26
          and Volume/MA ratio moved the most. Correlation only sees straight-line relationships with
          the target. SHAP shows what the model actually uses, including non-linear effects.
        </p>
        <Figure n={1} name="rank_disagreement_summary" caption="Rank difference between correlation and SHAP for each feature and stock (click to enlarge)." />
      </section>

      <section className="section">
        <Heading n={3} />
        <p>
          Bond yield was in the model’s SHAP top 5 for 6 of the 10 stocks, and was the #1 feature for
          JPM and AMZN, even though correlation ranked it low for most of them. That fits financial
          intuition: bank profits depend on interest rates, and growth stocks are sensitive to them.
          Grouped by sector, the patterns differ too (<Ref to="figure-2">Figure 2</Ref>). Energy
          leans on the S&amp;P 500 trend, while Healthcare and Technology lean on MACD.
        </p>
        <Figure n={2} name="sector_shap" caption="Average SHAP importance by sector." />
      </section>

      <section className="section">
        <Heading n={4} />
        <p>
          Our tuned model reported an average F1 of about 0.71, which looked good. When I checked it
          against the simplest possible baseline, a model that always predicts “up”, the numbers
          matched (<Ref to="table-2">Table 2</Ref>). With the decision threshold tuned down to 0.30,
          the model was predicting “up” for almost every day in a rising market.
        </p>
        <NumberedTable
          number={2}
          caption="Tuned-threshold results next to what “always predict up” would score. For an always-up model, accuracy is the share of up days p, and F1 = 2p / (1 + p)."
          columns={['Stock', 'Accuracy', 'Our F1', 'F1 of “always up”']}
          rows={baselineRows.map((r) => [r.stock, r.acc.toFixed(3), r.f1.toFixed(3), alwaysUpF1(r.acc)])}
        />
        <p>
          Threshold-free metrics tell the same story: ROC-AUC averaged about 0.57 across the 10 stocks,
          only a little better than random (0.5). Predicting 3-day direction from technical
          indicators alone is close to a coin flip (<Ref to="figure-3">Figure 3</Ref>). That’s an
          honest result, not a failure of the explainability work: SHAP still shows what the model
          relied on.
        </p>
        <Figure n={3} name="final_summary" caption="Accuracy and F1 per stock. Accuracy stays close to 0.5–0.6 even where F1 looks high." />
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
          <em>Stack.</em> {['Python', 'PyTorch', 'SHAP', 'scikit-learn', 'pandas', 'NumPy', 'yfinance'].join(' · ')}
        </p>
      </section>

      <p className="back end"><a href="#projects">← Back to portfolio</a></p>
    </main>
  );
}
