'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

/**
 * Redirects /dashboard/[slug]/sales to /dashboard/[slug]/ingredients.
 * Sales data (units sold, revenue) is now inline in the Menu items view.
 */
export default function DashboardSalesRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  useEffect(() => {
    router.replace(`/dashboard/${slug}/ingredients`);
  }, [router, slug]);

  return (
    <div className="demo-layout">
      <main className="demo-main">
        <div className="dashboard-loading">
          <p>Redirecting to Menu &amp; Recipes…</p>
        </div>
      </main>
    </div>
  );
}
