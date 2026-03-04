'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function LandingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent body scroll when menu is open and close on resize to desktop
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [menuOpen]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 768) setMenuOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const fullNavLinks = (
    <>
      <Link href="#how" onClick={() => setMenuOpen(false)}>How it works</Link>
      <Link href="#report" onClick={() => setMenuOpen(false)}>Example report</Link>
      <Link href="#pricing" onClick={() => setMenuOpen(false)}>Pricing</Link>
      <Link href="#faq" onClick={() => setMenuOpen(false)}>FAQ</Link>
      <Link href="/login" className="btn btn-primary" onClick={() => setMenuOpen(false)}>Log in</Link>
    </>
  );

  const mobileNavContent = menuOpen && (
    <div
      id="landing-nav-mobile"
      className="landing-nav-mobile landing"
      data-open="true"
      aria-hidden="false"
    >
      <nav className="landing-nav-mobile-inner" aria-label="Main">
        {fullNavLinks}
      </nav>
    </div>
  );

  return (
    <>
      <header className="landing-header">
        <div className="landing-header-inner">
          <Link href="/" className="landing-brand">Margin Insights</Link>
          <nav className="landing-nav-desktop" aria-label="Main">
            <Link href="#how">How it works</Link>
            <Link href="#report">Example report</Link>
            <Link href="#pricing">Pricing</Link>
            <Link href="#faq">FAQ</Link>
            <Link href="/login" className="btn btn-primary">Log in</Link>
          </nav>
          <button
            type="button"
            className="landing-nav-toggle"
            aria-expanded={menuOpen}
            aria-controls="landing-nav-mobile"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span className="landing-nav-toggle-bar" />
            <span className="landing-nav-toggle-bar" />
            <span className="landing-nav-toggle-bar" />
          </button>
        </div>
      </header>
      {mounted && mobileNavContent && createPortal(mobileNavContent, document.body)}
    </>
  );
}
