'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

export default function AdminOverviewPage() {
  const [businessCount, setBusinessCount] = useState<number | null>(null);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [demoMode, setDemoMode] = useState<boolean | null>(null);
  const [wiping, setWiping] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [bRes, uRes, dRes] = await Promise.all([
        fetch('/api/admin/businesses'),
        fetch('/api/admin/users'),
        fetch('/api/admin/demo-mode'),
      ]);
      if (bRes.ok) {
        const data = await bRes.json();
        const businesses = Array.isArray(data) ? data : [];
        setBusinessCount(businesses.filter((b: { slug?: string }) => b.slug !== 'admin').length);
      }
      if (uRes.ok) {
        const data = await uRes.json();
        const users = Array.isArray(data) ? data : [];
        setUserCount(users.filter((u: { business_name?: string | null }) => u.business_name !== 'admin').length);
      }
      if (dRes.ok) {
        const data = await dRes.json();
        setDemoMode(data.demoMode ?? false);
      }
    } catch {
      setBusinessCount(0);
      setUserCount(0);
      setDemoMode(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleWipe = async () => {
    if (
      !confirm(
        'Disable demo mode and wipe all operational data (ingredients, recipes, menu prices, sales, cost snapshots)? Businesses and users will be preserved. This cannot be undone.'
      )
    ) {
      return;
    }
    setWiping(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/wipe-database', { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Failed to wipe');
      }
      setDemoMode(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to wipe database');
    } finally {
      setWiping(false);
    }
  };

  const handleLoadDemo = async () => {
    if (
      !confirm(
        'Load demo data? This will replace all existing ingredients, recipes, menu prices, and sales with sample data.'
      )
    ) {
      return;
    }
    setLoadingDemo(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/load-demo-data', { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Failed to load demo data');
      }
      setDemoMode(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load demo data');
    } finally {
      setLoadingDemo(false);
    }
  };

  return (
    <div className="admin-overview">
      <h1 className="admin-overview-title">Admin Overview</h1>
      <p className="admin-overview-desc">
        Manage businesses and users across your multi-tenant platform.
      </p>
      <div className="admin-overview-cards">
        <Link href="/admin/businesses" className="admin-overview-card">
          <span className="admin-overview-card-value">
            {businessCount ?? '—'}
          </span>
          <span className="admin-overview-card-label">Businesses</span>
        </Link>
        <Link href="/admin/users" className="admin-overview-card">
          <span className="admin-overview-card-value">
            {userCount ?? '—'}
          </span>
          <span className="admin-overview-card-label">Users</span>
        </Link>
      </div>

      <section className="admin-demo-mode">
        <h2 className="admin-demo-mode-title">Demo mode</h2>
        <p className="admin-demo-mode-desc">
          Demo mode provides sample ingredients, recipes, menu prices, and sales data for new companies.
          Disable it and wipe the database when you&apos;re ready to import real data for each company.
        </p>
        <div className="admin-demo-mode-status">
          <span className="admin-demo-mode-label">Status:</span>
          <span className="admin-demo-mode-value">
            {demoMode === null ? '—' : demoMode ? 'On' : 'Off'}
          </span>
        </div>
        <div className="admin-demo-mode-actions">
          <button
            type="button"
            className="btn btn-danger"
            onClick={handleWipe}
            disabled={wiping}
            title="Wipe all operational data (ingredients, recipes, sales, etc.) and disable demo mode. Businesses and users are preserved."
          >
            {wiping ? 'Wiping…' : 'Disable demo mode & wipe database'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleLoadDemo}
            disabled={loadingDemo}
          >
            {loadingDemo ? 'Loading…' : 'Load demo data'}
          </button>
        </div>
        {error && (
          <div className="admin-error" role="alert">
            {error}
          </div>
        )}
      </section>
    </div>
  );
}
