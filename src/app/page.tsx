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
              Your best-sellers can be your least profitable. We help you spot where money is leaking — in pour cost, over-pouring, and menu pricing — so you can fix it.
            </p>
            <div className="hero-demo-links">
              <Link href="/login" className="btn btn-primary btn-lg">Try it free</Link>
            </div>
            <p className="hero-trust">Works with Square, Toast &amp; CSV exports. No POS login required. Free to use.</p>
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
          <Image src="/images/workflow.png" alt="Workflow: sign up free, recipe & cost, see the leaks" width={800} height={280} className="workflow-img" />
        </div>
        <div className="steps">
          <div className="step">
            <span className="step-num">1</span>
            <h3>Add your menu</h3>
            <p>Create a free account and add a few menu items with sales. No credit card.</p>
          </div>
          <div className="step">
            <span className="step-num">2</span>
            <h3>Add recipes & costs</h3>
            <p>Map items to ingredients and costs. We compute true cost per serving.</p>
          </div>
          <div className="step">
            <span className="step-num">3</span>
            <h3>See where you’re losing money</h3>
            <p>We rank items by margin and volume, flag bottom-margin items, and show you how much you could recover with better pricing.</p>
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
              &ldquo;You&apos;re losing approximately <strong>$1,240/month</strong> on 8 items by pricing below your target margin.&rdquo;
            </p>
            <p className="report-detail">We show you exactly which items to adjust and what price to try. No guesswork.</p>
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
                <div className="price-amount">$0<span>/month</span></div>
                <p>
                  Margin Insights is free to use. You get the full ingredient-level costing, menu margin dashboard, profit leak report, and price suggestions — no hidden fees.
                </p>
                <div className="price-card-actions">
                  <Link href="/login" className="btn btn-primary">
                    Get started free
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="section faq">
        <h2>FAQ</h2>
        <dl className="faq-list">
          <dt>Is my data safe?</dt>
          <dd>We store minimal data per restaurant. No employee names, no sensitive identifiers. Your data stays with you.</dd>
          <dt>Any contract?</dt>
          <dd>No. Use it free, stop when you want.</dd>
          <dt>What POS do you support?</dt>
          <dd>Works with Square, Toast &amp; CSV exports. No POS login required. More integrations coming.</dd>
        </dl>
      </section>

      <footer className="landing-footer">
        <p>Margin Insights — helping independent restaurants keep more of what they make.</p>
      </footer>
    </div>
);

export default LandingPage;
