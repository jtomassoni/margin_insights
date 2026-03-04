'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useDashboardDataOptional } from '@/context/DashboardDataContext';
import DashboardSidebar from '@/components/DashboardSidebar';

interface DashboardShellProps {
  slug: string;
  children: React.ReactNode;
}

export default function DashboardShell({ slug, children }: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const dashboardData = useDashboardDataOptional();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [businessName, setBusinessName] = useState<string | null>(null);

  useEffect(() => {
    setImgError(false);
  }, [session?.user?.image]);

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user) return;
    const role = (session.user as { role?: string }).role;
    if (role !== 'owner') return;
    fetch('/api/me')
      .then((r) => r.json())
      .then((data) => setBusinessName(data.businessName ?? null))
      .catch(() => setBusinessName(null));
  }, [status, session?.user]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const mq = window.matchMedia('(max-width: 1023px)');
    if (!mq.matches) return;
    document.documentElement.classList.add('dashboard-sidebar-open');
    return () => document.documentElement.classList.remove('dashboard-sidebar-open');
  }, [sidebarOpen]);

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

  return (
    <div className="dashboard-shell">
      <DashboardSidebar
        slug={slug}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className={`dashboard-shell-main ${sidebarOpen ? 'dashboard-shell-main--menu-open' : ''}`}>
        <header className="dashboard-shell-header">
          <button
            type="button"
            className="dashboard-shell-menu-btn"
            onClick={() => setSidebarOpen((o) => !o)}
            aria-expanded={sidebarOpen}
            aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
          >
            <span className="dashboard-shell-menu-bar" />
            <span className="dashboard-shell-menu-bar" />
            <span className="dashboard-shell-menu-bar" />
          </button>
          <Link href={`/dashboard/${slug}`} className="dashboard-shell-brand-wrap">
            <span className="dashboard-shell-brand">Margin Insights</span>
            <span className="dashboard-shell-context">
              {businessName ? `${businessName}` : 'Dashboard'}
            </span>
          </Link>
          <div className="dashboard-shell-actions">
            {(session?.user || status === 'loading') && (
              <Link
                href={(session?.user as { role?: string })?.role === 'admin' ? '/dashboard/profile' : `/dashboard/${slug}/profile`}
                className="dashboard-shell-user"
                title={userDisplay}
              >
                <span className="dashboard-shell-avatar" aria-hidden>
                  {session?.user?.image && !imgError ? (
                    <img
                      src={session.user.image}
                      alt=""
                      width={32}
                      height={32}
                      referrerPolicy="no-referrer"
                      onError={() => setImgError(true)}
                    />
                  ) : (
                    (session?.user?.name || session?.user?.email || '?').charAt(0).toUpperCase()
                  )}
                </span>
                <span className="dashboard-shell-user-name">{userDisplay}</span>
              </Link>
            )}
            <button
              type="button"
              className="btn btn-secondary btn-sm dashboard-shell-signout"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut ? '…' : 'Sign out'}
            </button>
          </div>
        </header>

        <main className="dashboard-shell-content">
          {children}
        </main>
      </div>
    </div>
  );
}
