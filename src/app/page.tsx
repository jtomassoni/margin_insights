import Link from 'next/link';
import Image from 'next/image';
import LandingHeader from '@/components/LandingHeader';
import ValueCards from '@/components/ValueCards';
import ScrollHint from '@/components/ScrollHint';

// Hero uses plain <img> so it stays within viewport on mobile (Next/Image wrapper was forcing overflow)
const HeroImage = () => (
  <img
    src="/images/hero.png"
    alt="Margin Insights dashboard preview"
    width={560}
    height={360}
    className="hero-img"
    fetchPriority="high"
  />
);

const LandingPage = () => (
    <div className="landing">
      <LandingHeader />

      <section className="hero">
        <div className="hero-inner">
          <div className="hero-content">
            <h1>Know your true margin. Down to the ingredient.</h1>
            <p className="hero-sub">
              Your best-sellers can be your least profitable — we flag the leaks in pour cost and menu pricing using your POS data.
            </p>
            <div className="hero-demo-links">
              <Link href="/demo-dashboard" className="btn btn-primary btn-lg">Try the demo</Link>
            </div>
            <p className="hero-trust">Works with Square, Toast &amp; CSV exports. No POS login required.</p>
          </div>
          <div className="hero-image">
            <div className="hero-image-wrap">
              <HeroImage />
            </div>
          </div>
        </div>
        <ScrollHint />
        <ValueCards />
      </section>

      <section id="how" className="section how">
        <h2>How it works</h2>
        <div className="how-workflow">
          <Image src="/images/workflow.png" alt="Workflow: try demo, recipe & cost, see the leaks" width={800} height={280} className="workflow-img" />
        </div>
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
          <div className="report-graphic">
            <Image src="/images/report-graphic.png" alt="Profit leak report example" width={500} height={280} />
          </div>
          <div className="report-copy">
            <p className="report-message">
              &ldquo;You&apos;re losing approximately <strong>$1,240/month</strong> on 8 SKU(s) by pricing below target margin.&rdquo;
            </p>
            <p className="report-detail">Bottom-margin items get actionable price suggestions and estimated upside. No guesswork.</p>
          </div>
        </div>
      </section>

      <section id="pricing" className="section pricing">
        <div className="pricing-with-illustration">
          <div className="pricing-illustration">
            <Image src="/images/owner-illustration.png" alt="" width={320} height={280} />
          </div>
          <div className="pricing-content">
        <h2>Pricing</h2>
        <div className="price-cards">
          <div className="price-card">
            <div className="price-amount">$249<span>/month</span></div>
            <p>Full access: CSV ingestion, recipe builder, margin dashboard, profit leak report, and price suggestions. Cancel anytime.</p>
            <div className="price-card-actions">
              <Link href="/demo-dashboard" className="btn btn-primary">Try the demo</Link>
            </div>
          </div>
          <div className="price-card price-card-lifetime">
            <span className="price-card-badge">Limited — while we&apos;re new</span>
            <div className="price-amount">$2,000<span> once</span></div>
            <p>Lifetime access. Same full product — never pay a subscription. For our first customers who want to own it forever.</p>
            <div className="price-card-actions">
              <Link href="/demo-dashboard" className="btn btn-outline">Try the demo first</Link>
            </div>
          </div>
        </div>
          </div>
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
          <dd>Works with Square, Toast &amp; CSV exports. No POS login required. More integrations coming.</dd>
        </dl>
      </section>

      <footer className="landing-footer">
        <p>Margin Insights — POS Profit Intelligence for independents.</p>
      </footer>
    </div>
);

export default LandingPage;
