'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';

const adminNavItems = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/businesses', label: 'Businesses' },
  { href: '/dashboard/users', label: 'Users' },
] as const;

interface Business {
  id: string;
  name: string;
  slug: string;
}

function JumpToCompanyFlyout({
  businesses,
  onNavigate,
  onClose,
}: {
  businesses: Business[];
  onNavigate: (slug: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = businesses
    .filter((b) => b.slug !== 'admin')
    .filter((b) =>
      b.name.toLowerCase().includes(query.trim().toLowerCase()) ||
      b.slug.toLowerCase().includes(query.trim().toLowerCase())
    );

  useEffect(() => {
    inputRef.current?.focus();
    setHighlightIndex(0);
  }, []);

  useEffect(() => {
    setHighlightIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter' && filtered.length > 0) {
        e.preventDefault();
        const selected = filtered[highlightIndex];
        if (selected) {
          onNavigate(selected.slug);
          onClose();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [filtered, highlightIndex, onNavigate, onClose]);

  const handleSelect = (b: Business) => {
    onNavigate(b.slug);
    onClose();
  };

  return (
    <div className="admin-jump-flyout">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search company…"
        className="admin-jump-flyout-input"
        aria-label="Search company"
      />
      <div ref={listRef} className="admin-jump-flyout-list" role="listbox">
        {filtered.length === 0 ? (
          <div className="admin-jump-flyout-empty">No companies match</div>
        ) : (
          filtered.map((b, i) => (
            <button
              key={b.id}
              type="button"
              role="option"
              aria-selected={i === highlightIndex}
              className={`admin-jump-flyout-item ${i === highlightIndex ? 'admin-jump-flyout-item--highlight' : ''}`}
              onClick={() => handleSelect(b)}
              onMouseEnter={() => setHighlightIndex(i)}
            >
              {b.name}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export default function DashboardAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [navOpen, setNavOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [jumpOpen, setJumpOpen] = useState(false);
  const jumpRef = useRef<HTMLDivElement>(null);

  const role = (session?.user as { role?: string })?.role;
  const businessSlug = (session?.user as { businessSlug?: string | null })?.businessSlug;

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      fetch('/api/me')
        .then((r) => r.json())
        .then((data) => setBusinessName(data.businessName ?? null))
        .catch(() => setBusinessName(null));
      fetch('/api/admin/businesses')
        .then((r) => r.ok ? r.json() : [])
        .then((data: Business[]) => setBusinesses(Array.isArray(data) ? data : []))
        .catch(() => setBusinesses([]));
    }
  }, [status, session?.user]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/dashboard');
      return;
    }
    if (status === 'authenticated' && role !== 'admin') {
      router.replace(businessSlug ? `/dashboard/${businessSlug}` : '/signup');
    }
  }, [status, role, businessSlug, router]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (jumpRef.current && !jumpRef.current.contains(e.target as Node)) {
        setJumpOpen(false);
      }
    };
    if (jumpOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [jumpOpen]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const result = await signOut({ redirect: false, callbackUrl: '/' });
      router.push(result?.url ?? '/');
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  };

  if (status === 'loading' || (status === 'authenticated' && role !== 'admin')) {
    return (
      <div className="landing demo-page">
        <div className="dashboard-loading">
          <p>Loading…</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="landing demo-page admin-page">
      <header className="dashboard-header admin-header">
        <div className="dashboard-header-inner">
          <div className="dashboard-header-brand">
            Margin Insights
            <span className="dashboard-header-subtitle">
              {businessName ? `${businessName} · Admin` : 'Admin'}
            </span>
          </div>
          <button
            type="button"
            className="dashboard-header-nav-toggle"
            onClick={() => setNavOpen((o) => !o)}
            aria-expanded={navOpen}
            aria-controls="admin-nav"
            aria-label={navOpen ? 'Close menu' : 'Open menu'}
          >
            <span className="dashboard-header-nav-toggle-bar" />
            <span className="dashboard-header-nav-toggle-bar" />
            <span className="dashboard-header-nav-toggle-bar" />
          </button>
          <nav
            id="admin-nav"
            className={`dashboard-header-nav ${navOpen ? 'dashboard-header-nav--open' : ''}`}
            aria-label="Admin sections"
          >
            {adminNavItems.map(({ href, label }) => {
              const isActive =
                href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={isActive ? 'dashboard-header-nav-active' : ''}
                  onClick={() => setNavOpen(false)}
                >
                  {label}
                </Link>
              );
            })}
            <span className="dashboard-header-nav-divider" aria-hidden />
            <div ref={jumpRef} className="admin-jump-wrap">
              <button
                type="button"
                className="dashboard-header-nav-extra admin-jump-trigger"
                onClick={() => {
                  setJumpOpen((o) => !o);
                  setNavOpen(false);
                }}
                aria-expanded={jumpOpen}
                aria-haspopup="listbox"
              >
                Jump to company
              </button>
              {jumpOpen && (
                <div className="admin-jump-flyout-wrap">
                  <JumpToCompanyFlyout
                    businesses={businesses}
                    onNavigate={(slug) => {
                      router.push(`/dashboard/${slug}`);
                      setJumpOpen(false);
                    }}
                    onClose={() => setJumpOpen(false)}
                  />
                </div>
              )}
            </div>
          </nav>
          <div className="dashboard-header-actions">
            {session?.user && (
              <Link
                href="/dashboard/profile"
                className="dashboard-header-user"
              >
                <span className="dashboard-header-user-info">
                  <span className="dashboard-header-user-name">
                    {[
                      session.user.name ?? session.user.email ?? 'Admin',
                      businessName,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
              </Link>
            )}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
      </header>
      <main className="demo-main admin-main">
        {children}
      </main>
    </div>
  );
}
