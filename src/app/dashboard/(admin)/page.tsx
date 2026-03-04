'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function DashboardAdminOverviewPage() {
  const [businessCount, setBusinessCount] = useState<number | null>(null);
  const [userCount, setUserCount] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [bRes, uRes] = await Promise.all([
          fetch('/api/admin/businesses'),
          fetch('/api/admin/users'),
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
      } catch {
        setBusinessCount(0);
        setUserCount(0);
      }
    }
    load();
  }, []);

  return (
    <div className="admin-overview">
      <h1 className="admin-overview-title">Admin Overview</h1>
      <p className="admin-overview-desc">
        Manage businesses and users across your multi-tenant platform.
      </p>
      <div className="admin-overview-cards">
        <Link href="/dashboard/businesses" className="admin-overview-card">
          <span className="admin-overview-card-value">
            {businessCount ?? '—'}
          </span>
          <span className="admin-overview-card-label">Businesses</span>
        </Link>
        <Link href="/dashboard/users" className="admin-overview-card">
          <span className="admin-overview-card-value">
            {userCount ?? '—'}
          </span>
          <span className="admin-overview-card-label">Users</span>
        </Link>
      </div>
    </div>
  );
}
