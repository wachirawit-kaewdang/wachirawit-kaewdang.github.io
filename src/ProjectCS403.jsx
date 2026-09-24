// Case study page for the CS403 senior project, shown at #/cs403.
const img = (name) => `${import.meta.env.BASE_URL}cs403/${name}.webp`;

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

function Figure({ name, caption }) {
  return (
    <figure className="figure">
      <a href={img(name)} target="_blank" rel="noreferrer">
        <img src={img(name)} alt={caption} />
      </a>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

export default function ProjectCS403() {
  return (
    <main className="container case">
      <a href="#projects" className="back">← Back to portfolio</a>

      <p className="eyebrow">Senior project (CS403) · Thammasat University · 2-person team</p>
      <h1>Stock Direction Prediction with Explainable AI</h1>
      <p className="lead">
        Can SHAP tell us something about a stock-prediction model that plain correlation can't? We
        trained an LSTM with self-attention on 10 US stocks, explained it with SHAP, and compared
        those explanations with Pearson correlation. We also checked honestly whether the model
        beat a naive baseline.
      </p>
      <div className="actions">
        <a className="btn primary" href="https://github.com/wachirawit-kaewdang/Project-CS403" target="_blank" rel="noreferrer">
          Code on GitHub
        </a>
      </div>

      <section className="case-section">
        <h2>Setup</h2>
        <dl className="facts">
          <div><dt>Data</dt><dd>10 US stocks, 2 per sector (Tech, Healthcare, Energy, Finance, Consumer), Jan 2020 – Apr 2025</dd></div>
          <div><dt>Features</dt><dd>27 daily features: returns, volatility, moving averages, RSI/MACD/Stochastic, volume/OBV, S&amp;P 500 context, bond yield</dd></div>
          <div><dt>Target</dt><dd>Direction of the 3-day forward return (up / down), 80/20 time-ordered split</dd></div>
          <div><dt>Model</dt><dd>LSTM (3 layers, hidden 128) + self-attention over a 60-day window, Focal Loss with class weights</dd></div>
          <div><dt>Compared with</dt><dd>Random Forest, Logistic Regression, a soft-voting ensemble, and a version with VIX (market fear) features</dd></div>
        </dl>
      </section>

      <section className="case-section">
        <h2>Finding 1: SHAP and correlation disagree a lot</h2>
        <p>
          For every stock we ranked the 27 features twice: by absolute Pearson correlation with the
          target, and by mean |SHAP| on the trained LSTM. The two rankings disagreed by roughly 5 to 12
          positions per feature on average. Volume change, EMA26 and Volume/MA ratio moved the most.
          Correlation only sees straight-line relationships with the target. SHAP shows what the
          model actually uses, including non-linear effects.
        </p>
        <Figure name="rank_disagreement_summary" caption="Rank difference between correlation and SHAP for each feature and stock (click to enlarge)." />
      </section>

      <section className="case-section">
        <h2>Finding 2: Bond yield matters to the model, but correlation misses it</h2>
        <p>
          Bond yield was in the model's SHAP top 5 for 6 of the 10 stocks, and was the #1 feature for
          JPM and AMZN, even though correlation ranked it low for most of them. That fits financial
          intuition: bank profits depend on interest rates, and growth stocks are sensitive to them.
          Grouped by sector, the patterns differ too. Energy leans on the S&amp;P 500 trend, while
          Healthcare and Technology lean on MACD.
        </p>
        <Figure name="sector_shap" caption="Average SHAP importance by sector." />
      </section>

      <section className="case-section">
        <h2>Checking the results honestly</h2>
        <p>
          Our tuned model reported an average F1 of about 0.71, which looked good. When I checked it
          against the simplest possible baseline, a model that always predicts "up", the numbers
          matched. With the decision threshold tuned down to 0.30, the model was predicting "up" for
          almost every day in a rising market.
        </p>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Stock</th><th>Accuracy</th><th>Our F1</th><th>F1 of "always up"</th></tr>
            </thead>
            <tbody>
              {baselineRows.map((r) => (
                <tr key={r.stock}>
                  <td>{r.stock}</td><td>{r.acc.toFixed(3)}</td><td>{r.f1.toFixed(3)}</td><td>{alwaysUpF1(r.acc)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Threshold-free metrics tell the same story: ROC-AUC averaged about 0.57 across the 10 stocks,
          only a little better than random (0.5). Predicting 3-day direction from technical
          indicators alone is close to a coin flip. That's an honest result, not a failure of the
          explainability work: SHAP still shows what the model relied on.
        </p>
        <Figure name="final_summary" caption="Accuracy and F1 per stock. Accuracy stays close to 0.5–0.6 even where F1 looks high." />
      </section>

      <section className="case-section">
        <h2>What I'd do differently</h2>
        <ul className="points">
          <li>Always report a naive baseline ("always up", majority class) next to every metric.</li>
          <li>Tune the decision threshold and early stopping on a separate validation set, not the test set.</li>
          <li>Fit the feature scaler on the training data only, to avoid leaking test-period statistics.</li>
          <li>Use walk-forward validation across several time windows instead of one 80/20 split.</li>
          <li>Lead with threshold-free metrics such as ROC-AUC for noisy targets like short-term returns.</li>
        </ul>
      </section>

      <section className="case-section">
        <h2>My part</h2>
        <p>
          I collected and prepared the training data, and designed the training
          approach and model architecture. My teammate Tumrong Saechoen designed the analysis
          methodology and the VIX market-sentiment component.
        </p>
        <ul className="tags">
          {['Python', 'PyTorch', 'SHAP', 'scikit-learn', 'pandas', 'NumPy', 'yfinance'].map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>

      <a href="#projects" className="back">← Back to portfolio</a>
    </main>
  );
}
