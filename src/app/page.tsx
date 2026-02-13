import Link from 'next/link';

const LandingPage = () => (
    <div className="landing">
      <header className="landing-header">
        <div className="landing-brand">Margin Insights</div>
        <nav>
          <Link href="#how">How it works</Link>
          <Link href="#report">Example report</Link>
          <Link href="#pricing">Pricing</Link>
          <Link href="#faq">FAQ</Link>
          <Link href="/demo-dashboard" className="btn btn-primary">Try a demo</Link>
        </nav>
      </header>

      <section className="hero">
        <h1>Stop leaving money on the table</h1>
        <p className="hero-sub">
          Independent bars and restaurants lose thousands each month to hidden profit leaks.
          We use your POS data and ingredient-level cost modeling to find exactly where — and how much.
        </p>
        <Link href="/demo-dashboard" className="btn btn-primary btn-lg">Try a demo</Link>
      </section>

      <section id="how" className="section how">
        <h2>How it works</h2>
        <div className="steps">
          <div className="step">
            <span className="step-num">1</span>
            <h3>Try the demo</h3>
            <p>Run our demo with sample Toast-style data. See item names, units sold, and revenue in one place.</p>
          </div>
          <div className="step">
            <span className="step-num">2</span>
            <h3>Recipe & cost</h3>
            <p>Map menu items to ingredients and costs. We compute true cost per serving.</p>
          </div>
          <div className="step">
            <span className="step-num">3</span>
            <h3>See the leaks</h3>
            <p>We rank items by margin and volume, flag bottom-margin SKUs, and estimate lost profit if you raise prices to a target margin.</p>
          </div>
        </div>
      </section>

      <section id="report" className="section example">
        <h2>Example profit leak report</h2>
        <div className="report-preview">
          <p className="report-message">
            &ldquo;You&apos;re losing approximately <strong>$1,240/month</strong> on 8 SKU(s) by pricing below target margin.&rdquo;
          </p>
          <p className="report-detail">Bottom-margin items get actionable price suggestions and estimated upside. No guesswork.</p>
        </div>
      </section>

      <section id="pricing" className="section pricing">
        <h2>Pricing</h2>
        <p className="pricing-note">$99/month for our first client only — founding beta.</p>
        <div className="price-card">
          <div className="price-amount">$249<span>/month</span></div>
          <p>Full access: CSV ingestion, recipe builder, margin dashboard, profit leak report, and price suggestions.</p>
          <Link href="/demo-dashboard" className="btn btn-primary">Try a demo</Link>
        </div>
      </section>

      <section id="faq" className="section faq">
        <h2>FAQ</h2>
        <dl className="faq-list">
          <dt>Data security?</dt>
          <dd>We store minimal data per restaurant. No employee names, no sensitive identifiers. Your data is siloed to your instance.</dd>
          <dt>Contract?</dt>
          <dd>No long-term lock-in. Cancel when you want.</dd>
          <dt>What POS do you support?</dt>
          <dd>V1 supports Toast CSV exports. More integrations later.</dd>
        </dl>
      </section>

      <footer className="landing-footer">
        <p>Margin Insights — POS Profit Intelligence for independents.</p>
      </footer>
    </div>
);

export default LandingPage;
