'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { signOut, useSession } from 'next-auth/react';
import { useDashboardDataOptional } from '@/context/DashboardDataContext';
import CreateSnapshotModal from '@/components/CreateSnapshotModal';

function navItemsFor(slug: string) {
  return [
    { href: `/dashboard/${slug}`, label: 'Overview' },
    { href: `/dashboard/${slug}/reporting`, label: 'Reporting' },
    { href: `/dashboard/${slug}/ingredients`, label: 'Menu & Recipes' },
    { href: `/dashboard/${slug}/sales`, label: 'Sales' },
  ] as const;
}

const DashboardHeader = ({ slug = 'demo' }: { slug?: string }) => {
  const navItems = navItemsFor(slug);
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const dashboardData = useDashboardDataOptional();
  const ingredients = dashboardData?.ingredients ?? [];
  const hasAnyIngredients = dashboardData?.hasAnyIngredients ?? false;
  const [loggingOut, setLoggingOut] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [snapshotModalOpen, setSnapshotModalOpen] = useState(false);
  const [businessName, setBusinessName] = useState<string | null>(null);

  useEffect(() => {
    setImgError(false);
  }, [session?.user?.image]);

  useEffect(() => {
    if (!navOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNavOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navOpen]);

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user) return;
    const role = (session.user as { role?: string }).role;
    if (role !== 'owner') return;
    fetch('/api/me')
      .then((r) => r.json())
      .then((data) => setBusinessName(data.businessName ?? null))
      .catch(() => setBusinessName(null));
  }, [status, session?.user]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const result = await signOut({ redirect: false, callbackUrl: '/' });
      if (result?.url) {
        router.push(result.url);
      } else {
        router.push('/');
      }
    } finally {
      router.refresh();
    }
  };

  const userDisplay =
    status === 'loading'
      ? 'Loading…'
      : [session?.user?.name || session?.user?.email || 'Account', businessName]
          .filter(Boolean)
          .join(' · ');

  const mobileMenu = navOpen && typeof document !== 'undefined' && createPortal(
    <div className="landing dashboard-mobile-menu-portal">
      <div
        className="dashboard-mobile-menu-backdrop"
        onClick={() => setNavOpen(false)}
        aria-hidden
      />
      <div className="dashboard-mobile-menu-panel">
        <div className="dashboard-mobile-menu-header">
          <div className="dashboard-mobile-menu-brand">
            <span className="dashboard-mobile-menu-app-name">Margin Insights</span>
            <span className="dashboard-mobile-menu-subtitle">
              {businessName ? `${businessName} · Dashboard` : 'Dashboard'}
            </span>
          </div>
          <button
            type="button"
            className="dashboard-mobile-menu-close"
            onClick={() => setNavOpen(false)}
            aria-label="Close menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M4 4l12 12M16 4L4 16" />
            </svg>
          </button>
        </div>
        <nav className="dashboard-mobile-menu-nav" aria-label="Dashboard menu">
          <div className="dashboard-mobile-menu-section">
            {navItems.map(({ href, label }) => {
              const isActive =
                href === `/dashboard/${slug}`
                  ? pathname === `/dashboard/${slug}`
                  : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`dashboard-mobile-menu-link ${isActive ? 'dashboard-mobile-menu-link--active' : ''}`}
                  onClick={() => setNavOpen(false)}
                >
                  {label}
                </Link>
              );
            })}
          </div>
          {hasAnyIngredients && (
            <div className="dashboard-mobile-menu-section">
              <button
                type="button"
                className="dashboard-mobile-menu-link dashboard-mobile-menu-link--action"
                onClick={() => { setNavOpen(false); setSnapshotModalOpen(true); }}
              >
                Create cost snapshot
              </button>
            </div>
          )}
          <div className="dashboard-mobile-menu-section dashboard-mobile-menu-section--user">
            {(session?.user || status === 'loading') && (
              <Link
                href={(session?.user as { role?: string })?.role === 'admin' ? '/admin' : `/dashboard/${slug}/profile`}
                className="dashboard-mobile-menu-link dashboard-mobile-menu-link--user"
                onClick={() => setNavOpen(false)}
              >
                <span className="dashboard-mobile-menu-avatar" aria-hidden>
                  {session?.user?.image && !imgError ? (
                    <img src={session.user.image!} alt="" width={24} height={24} referrerPolicy="no-referrer" onError={() => setImgError(true)} />
                  ) : (
                    (session?.user?.name || session?.user?.email || '?').charAt(0).toUpperCase()
                  )}
                </span>
                {userDisplay}
              </Link>
            )}
            <button
              type="button"
              className="dashboard-mobile-menu-link dashboard-mobile-menu-link--signout"
              onClick={() => { setNavOpen(false); handleLogout(); }}
              disabled={loggingOut}
            >
              {loggingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </nav>
      </div>
    </div>,
    document.body
  );

  return (
    <>
    <header className={`dashboard-header ${navOpen ? 'dashboard-header--menu-open' : ''}`}>
      <div className="dashboard-header-inner">
        <div className="dashboard-header-brand">
          Margin Insights
          <span className="dashboard-header-subtitle">
            {businessName ? `${businessName} · Dashboard` : 'Dashboard'}
          </span>
        </div>
        <button
          type="button"
          className="dashboard-header-nav-toggle"
          onClick={() => setNavOpen((o) => !o)}
          aria-expanded={navOpen}
          aria-label={navOpen ? 'Close menu' : 'Open menu'}
        >
          <span className="dashboard-header-nav-toggle-bar" />
          <span className="dashboard-header-nav-toggle-bar" />
          <span className="dashboard-header-nav-toggle-bar" />
        </button>
      </div>
      <nav
        className={`dashboard-header-nav ${navOpen ? 'dashboard-header-nav--open' : ''}`}
        aria-label="Dashboard menu"
      >
          <div className="dashboard-header-nav-sections">
            {navItems.map(({ href, label }) => {
              const isActive =
                href === `/dashboard/${slug}`
                  ? pathname === `/dashboard/${slug}`
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
          </div>
          <div className="dashboard-header-nav-actions">
            {hasAnyIngredients && (
              <button
                type="button"
                className="btn btn-secondary btn-sm dashboard-header-snapshot-btn"
                onClick={() => {
                  setSnapshotModalOpen(true);
                  setNavOpen(false);
                }}
              >
                Create cost snapshot
              </button>
            )}
            {(session?.user || status === 'loading') && (
              <Link
                href={(session?.user as { role?: string })?.role === 'admin' ? '/admin' : `/dashboard/${slug}/profile`}
                className="dashboard-header-nav-user"
                onClick={() => setNavOpen(false)}
                aria-busy={status === 'loading'}
              >
                <span className="dashboard-header-user-avatar" aria-hidden>
                  {session?.user?.image && !imgError ? (
                    <img
                      src={session.user.image}
                      alt=""
                      width={32}
                      height={32}
                      className="dashboard-header-user-avatar-img"
                      referrerPolicy="no-referrer"
                      onError={() => setImgError(true)}
                    />
                  ) : (
                    (session?.user?.name || session?.user?.email || '?')
                      .charAt(0)
                      .toUpperCase()
                  )}
                </span>
                <span className="dashboard-header-nav-user-info">
                  <span className="dashboard-header-user-label">Signed in as</span>
                  <span className="dashboard-header-user-name">{userDisplay}</span>
                </span>
              </Link>
            )}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                handleLogout();
                setNavOpen(false);
              }}
              disabled={loggingOut}
            >
              {loggingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
      </nav>
      <div className="dashboard-header-inner dashboard-header-actions-wrap">
        <div className="dashboard-header-actions">
          {hasAnyIngredients && (
            <button
              type="button"
              className="btn btn-secondary btn-sm dashboard-header-snapshot-btn"
              onClick={() => setSnapshotModalOpen(true)}
            >
              <span className="dashboard-header-snapshot-label-full">Create cost snapshot</span>
              <span className="dashboard-header-snapshot-label-short">Snapshot</span>
            </button>
          )}
          {(session?.user || status === 'loading') && (
            <Link
              href={(session?.user as { role?: string })?.role === 'admin' ? '/admin' : `/dashboard/${slug}/profile`}
              className="dashboard-header-user"
              aria-busy={status === 'loading'}
            >
              <span className="dashboard-header-user-avatar" aria-hidden>
                {session?.user?.image && !imgError ? (
                  <img
                    src={session.user.image}
                    alt=""
                    width={32}
                    height={32}
                    className="dashboard-header-user-avatar-img"
                    referrerPolicy="no-referrer"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  (session?.user?.name || session?.user?.email || '?')
                    .charAt(0)
                    .toUpperCase()
                )}
              </span>
              <span className="dashboard-header-user-info">
                <span className="dashboard-header-user-label">Signed in as</span>
                <span className="dashboard-header-user-name">{userDisplay}</span>
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
      {mobileMenu}
      {snapshotModalOpen && (
        <CreateSnapshotModal
          ingredients={ingredients}
          onClose={() => setSnapshotModalOpen(false)}
        />
      )}
    </>
  );
};

export default DashboardHeader;

